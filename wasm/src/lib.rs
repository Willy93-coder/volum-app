use image::{imageops, GrayImage};
use imageproc::contrast::{otsu_level, threshold};
use imageproc::distance_transform::Norm;
use imageproc::filter::gaussian_blur_f32;
use imageproc::hough::{detect_lines, LineDetectionOptions, PolarLine};
use imageproc::morphology::erode;
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Serialize)]
struct Wall {
    start: Point,
    end: Point,
}

#[derive(Serialize)]
struct DetectedOpening {
    kind: String, // "door" | "window"
    start: Point,
    end: Point,
}

#[derive(Serialize)]
struct DetectionResult {
    walls: Vec<Wall>,
    openings: Vec<DetectedOpening>,
}

#[derive(Clone)]
struct Segment {
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
}

/// Detects walls, doors and windows in a floor plan image.
///
/// Pipeline:
///   1. Resize → grayscale → light blur
///   2. Otsu threshold → invert (walls = 255, background = 0)
///   3. Morphological erosion (removes thin noise: text, arrows, symbols)
///   4. Two-pass Hough line detection
///   5. Segment extraction along each Hough line
///   6. Geometric deduplication of wall segments
///   7. Gap analysis between adjacent collinear segments → openings
///   8. Map everything to canvas coordinates
#[wasm_bindgen]
pub fn detect_walls(
    image_bytes: &[u8],
    canvas_width: f64,
    canvas_height: f64,
) -> Result<JsValue, JsValue> {
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let max_size = 800u32;
    let scale = (max_size as f32 / img.width().max(img.height()) as f32).min(1.0);
    let proc_w = ((img.width() as f32 * scale) as u32).max(1);
    let proc_h = ((img.height() as f32 * scale) as u32).max(1);

    let resized = img.resize_exact(proc_w, proc_h, imageops::FilterType::Lanczos3);
    let gray = resized.to_luma8();
    let blurred = gaussian_blur_f32(&gray, 1.0);

    let thresh = otsu_level(&blurred);
    let mut binary = threshold(&blurred, thresh);
    imageops::invert(&mut binary);

    let white_px = binary.iter().filter(|&&p| p == 255).count();
    if white_px * 2 > (proc_w * proc_h) as usize {
        imageops::invert(&mut binary);
    }

    let clean = erode(&binary, Norm::L1, 1);

    let diag = (proc_w as f64).hypot(proc_h as f64);

    let vote_thresh = ((diag * 0.08) as u32).clamp(40, 160);
    let mut lines = detect_lines(
        &clean,
        LineDetectionOptions {
            vote_threshold: vote_thresh,
            suppression_radius: 22,
        },
    );

    let secondary_thresh = ((diag * 0.04) as u32).clamp(20, 60);
    let secondary = detect_lines(
        &clean,
        LineDetectionOptions {
            vote_threshold: secondary_thresh,
            suppression_radius: 14,
        },
    );
    for s in secondary {
        let dup = lines.iter().any(|p| {
            angle_diff(p.angle_in_degrees, s.angle_in_degrees) <= 5
                && (p.r - s.r).abs() < 25.0
        });
        if !dup {
            lines.push(s);
        }
    }

    let min_len = 40.0_f64;

    let mut segments: Vec<Segment> = lines
        .iter()
        .flat_map(|line| {
            segments_along_line(&clean, line, min_len)
                .into_iter()
                .map(|(x1, y1, x2, y2)| Segment { x1, y1, x2, y2 })
        })
        .collect();

    segments = geo_deduplicate(segments, 30.0, 6);

    // --- Gap analysis: openings between adjacent collinear wall segments ---
    // min/max gap in proc-space pixels (~19 cm .. ~163 cm at 800 px proc scale)
    let raw_openings = find_openings(&segments, 15.0, 130.0, 20.0, 5);

    // Scale everything to canvas coordinates.
    let sx = canvas_width  / proc_w as f64;
    let sy = canvas_height / proc_h as f64;

    let walls: Vec<Wall> = segments
        .into_iter()
        .map(|s| Wall {
            start: Point { x: (s.x1 * sx).round(), y: (s.y1 * sy).round() },
            end:   Point { x: (s.x2 * sx).round(), y: (s.y2 * sy).round() },
        })
        .collect();

    // Classify opening by width in proc-space: < proc_w/10 (~100 cm) → door.
    let door_threshold = proc_w as f64 / 10.0;

    let openings: Vec<DetectedOpening> = raw_openings
        .into_iter()
        .map(|s| {
            let width = ((s.x2 - s.x1).powi(2) + (s.y2 - s.y1).powi(2)).sqrt();
            DetectedOpening {
                kind: if width < door_threshold {
                    "door".to_string()
                } else {
                    "window".to_string()
                },
                start: Point { x: (s.x1 * sx).round(), y: (s.y1 * sy).round() },
                end:   Point { x: (s.x2 * sx).round(), y: (s.y2 * sy).round() },
            }
        })
        .collect();

    let result = DetectionResult { walls, openings };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ---------------------------------------------------------------------------
// Gap analysis — finds openings between adjacent collinear wall segments
// ---------------------------------------------------------------------------

/// Searches all pairs of wall segments for collinear adjacent pairs separated
/// by a gap in [min_gap, max_gap] pixels.  Returns the gap as a Segment whose
/// endpoints are the facing endpoints of the two wall segments.
fn find_openings(
    segments: &[Segment],
    min_gap: f64,
    max_gap: f64,
    max_perp: f64,
    max_ang: u32,
) -> Vec<Segment> {
    let mut openings = Vec::new();

    for i in 0..segments.len() {
        for j in (i + 1)..segments.len() {
            let a = &segments[i];
            let b = &segments[j];

            let ang_a = seg_angle_deg(a);
            let ang_b = seg_angle_deg(b);
            if angle_diff(ang_a, ang_b) > max_ang {
                continue;
            }

            let dir   = (ang_a as f64).to_radians();
            let cos_d = dir.cos();
            let sin_d = dir.sin();

            // Perpendicular distance (normal = (-sin_d, cos_d)).
            let r_a = -a.x1 * sin_d + a.y1 * cos_d;
            let r_b = -b.x1 * sin_d + b.y1 * cos_d;
            if (r_a - r_b).abs() > max_perp {
                continue;
            }

            // Project each segment onto the line direction.
            let proj = |x: f64, y: f64| x * cos_d + y * sin_d;
            let (a0, a1) = min_max(proj(a.x1, a.y1), proj(a.x2, a.y2));
            let (b0, b1) = min_max(proj(b.x1, b.y1), proj(b.x2, b.y2));

            // Determine which segment comes first.
            let (first, second, gap) =
                if a1 <= b0 { (a, b, b0 - a1) }
                else if b1 <= a0 { (b, a, a0 - b1) }
                else { continue }; // overlapping → same wall, not an opening

            if gap < min_gap || gap > max_gap {
                continue;
            }

            // The gap runs from the "far end" of first to the "near end" of second.
            let (gx1, gy1) = if proj(first.x1, first.y1) >= proj(first.x2, first.y2) {
                (first.x1, first.y1)
            } else {
                (first.x2, first.y2)
            };
            let (gx2, gy2) = if proj(second.x1, second.y1) <= proj(second.x2, second.y2) {
                (second.x1, second.y1)
            } else {
                (second.x2, second.y2)
            };

            openings.push(Segment { x1: gx1, y1: gy1, x2: gx2, y2: gy2 });
        }
    }

    openings
}

// ---------------------------------------------------------------------------
// Segment extraction — scans the binary wall mask along a Hough line
// ---------------------------------------------------------------------------

fn segments_along_line(
    mask: &GrayImage,
    line: &PolarLine,
    min_length: f64,
) -> Vec<(f64, f64, f64, f64)> {
    let w = mask.width()  as i64;
    let h = mask.height() as i64;
    let theta  = (line.angle_in_degrees as f64).to_radians();
    let cos_t  = theta.cos();
    let sin_t  = theta.sin();
    let dx     = -sin_t;
    let dy     =  cos_t;
    let ref_x  = line.r as f64 * cos_t;
    let ref_y  = line.r as f64 * sin_t;
    let range  = ((w as f64).hypot(h as f64) * 1.05) as i64;
    let max_gap = 10_usize;

    let mut result   = Vec::new();
    let mut seg_s: Option<(f64, f64)> = None;
    let mut seg_e: Option<(f64, f64)> = None;
    let mut gap = 0_usize;

    for t in -range..=range {
        let x  = ref_x + t as f64 * dx;
        let y  = ref_y + t as f64 * dy;
        let px = x.round() as i64;
        let py = y.round() as i64;

        let in_bounds = px >= 0 && px < w && py >= 0 && py < h;
        let is_wall   = in_bounds && mask.get_pixel(px as u32, py as u32)[0] > 128;

        if is_wall {
            gap = 0;
            seg_s.get_or_insert((x, y));
            seg_e = Some((x, y));
        } else {
            gap += 1;
            if gap > max_gap {
                push_if_long(&mut seg_s, &mut seg_e, min_length, &mut result);
                gap = 0;
            }
        }
    }
    push_if_long(&mut seg_s, &mut seg_e, min_length, &mut result);
    result
}

fn push_if_long(
    s: &mut Option<(f64, f64)>,
    e: &mut Option<(f64, f64)>,
    min_len: f64,
    out: &mut Vec<(f64, f64, f64, f64)>,
) {
    if let (Some(a), Some(b)) = (*s, *e) {
        if ((b.0 - a.0).powi(2) + (b.1 - a.1).powi(2)).sqrt() >= min_len {
            out.push((a.0, a.1, b.0, b.1));
        }
    }
    *s = None;
    *e = None;
}

// ---------------------------------------------------------------------------
// Geometric deduplication
// ---------------------------------------------------------------------------

fn geo_deduplicate(segs: Vec<Segment>, max_perp_dist: f64, max_angle_diff: u32) -> Vec<Segment> {
    let mut keep = vec![true; segs.len()];
    for i in 0..segs.len() {
        if !keep[i] { continue; }
        for j in (i + 1)..segs.len() {
            if !keep[j] { continue; }
            if segs_are_same_wall(&segs[i], &segs[j], max_perp_dist, max_angle_diff) {
                let len_i = seg_len(&segs[i]);
                let len_j = seg_len(&segs[j]);
                if len_j >= len_i { keep[i] = false; break; }
                else               { keep[j] = false; }
            }
        }
    }
    segs.into_iter().zip(keep).filter_map(|(s, k)| k.then_some(s)).collect()
}

fn segs_are_same_wall(a: &Segment, b: &Segment, max_perp: f64, max_ang: u32) -> bool {
    let ang_a = seg_angle_deg(a);
    let ang_b = seg_angle_deg(b);
    if angle_diff(ang_a, ang_b) > max_ang { return false; }

    let dir   = (ang_a as f64).to_radians();
    let cos_d = dir.cos();
    let sin_d = dir.sin();

    let r_a = -a.x1 * sin_d + a.y1 * cos_d;
    let r_b = -b.x1 * sin_d + b.y1 * cos_d;
    if (r_a - r_b).abs() > max_perp { return false; }

    let proj = |x: f64, y: f64| x * cos_d + y * sin_d;
    let (a0, a1) = min_max(proj(a.x1, a.y1), proj(a.x2, a.y2));
    let (b0, b1) = min_max(proj(b.x1, b.y1), proj(b.x2, b.y2));
    a1 + 20.0 >= b0 && b1 + 20.0 >= a0
}

fn seg_angle_deg(s: &Segment) -> u32 {
    let dx = s.x2 - s.x1;
    let dy = s.y2 - s.y1;
    let deg = dy.atan2(dx).to_degrees();
    ((deg.rem_euclid(180.0)) as u32).min(179)
}

fn seg_len(s: &Segment) -> f64 {
    ((s.x2 - s.x1).powi(2) + (s.y2 - s.y1).powi(2)).sqrt()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn angle_diff(a: u32, b: u32) -> u32 {
    let d = if a > b { a - b } else { b - a };
    d.min(180_u32.saturating_sub(d))
}

fn min_max(a: f64, b: f64) -> (f64, f64) {
    if a <= b { (a, b) } else { (b, a) }
}

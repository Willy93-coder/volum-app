<script setup lang="ts">
import { Input } from '@/components/ui/input'

const emit = defineEmits<{
  'file-selected': [url: string]
}>()

const VALID_TYPES = ['image/png', 'image/jpeg']

function handleFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return
  if (!VALID_TYPES.includes(file.type)) return

  const url = URL.createObjectURL(file)
  emit('file-selected', url)
}
</script>

<template>
  <Input type="file" accept=".png,.jpg,.jpeg" @change="handleFileChange" />
</template>

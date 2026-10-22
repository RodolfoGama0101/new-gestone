export function fieldErrorProps(id: string, error: unknown) {
  return { 'aria-invalid': !!error, 'aria-describedby': error ? id + '-error' : undefined }
}

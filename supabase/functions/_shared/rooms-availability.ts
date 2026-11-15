// The main site's explicit flag is authoritative for creating/joining Rooms.
// These defaults are the same public project/anon key used by rooms-entry.js.
// Optional overrides support isolated deployments without private credentials.
const DEFAULT_MAIN_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co'
const DEFAULT_MAIN_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8'

export async function getRoomsAvailability(): Promise<'enabled' | 'disabled' | 'unavailable'> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const rows = await Promise.race([
      (async () => {
        const url = new URL('/rest/v1/site_settings', Deno.env.get('MAIN_SUPABASE_URL') || DEFAULT_MAIN_URL)
        url.searchParams.set('id', 'eq.links')
        url.searchParams.set('select', 'value')
        const anon = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || DEFAULT_MAIN_ANON
        const response = await fetch(url, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
          cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new Error('Rooms setting unavailable')
        return response.json()
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(new Error('Rooms setting timed out'))
        }, 3000)
      }),
    ])
    if (!Array.isArray(rows) || rows.length !== 1) return 'unavailable'
    const enabled = rows[0]?.value?.rooms_enabled
    return enabled === true ? 'enabled' : enabled === false ? 'disabled' : 'unavailable'
  } catch {
    return 'unavailable'
  } finally {
    clearTimeout(timeout)
  }
}

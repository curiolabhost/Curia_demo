export async function POST(request: Request) {
  const { device } = await request.json()
  console.log('[Curia] device:', device)
  return new Response(null, { status: 204 })
}

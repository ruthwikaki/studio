
// src/app/page.tsx
export default function HomePage() {
  console.log('[HomePage] Rendering...');
  return (
    <div>
      <h1>Welcome to Minimal ARIA Test</h1>
      <p>If you see this, the Next.js frontend is working.</p>
      <p>
        Try accessing the <a href="/api/health" style={{color: "blue", textDecoration: "underline"}}>Test /api/health</a> endpoint.
      </p>
       <p>
        Or try: <a href="/api/ping" style={{color: "blue", textDecoration: "underline"}}>Test /api/ping</a> endpoint.
      </p>
    </div>
  );
}

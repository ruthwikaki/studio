
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex h-screen w-full items-center justify-center bg-blue-500/5 p-4">
      {children}
    </main>
  );
}

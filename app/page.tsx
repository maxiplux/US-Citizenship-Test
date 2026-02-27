import CivicsTest from '@/components/CivicsTest';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl h-[85vh] sm:h-[90vh]">
        <CivicsTest />
      </div>
    </main>
  );
}

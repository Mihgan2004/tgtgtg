import SplashIntro from '@/components/SplashIntro';

export default function Home() {
  return (
    <>
      <SplashIntro />
      <div className="space-y-8">
        <section className="card">
          <h1 className="h1">Miniapps · Ops</h1>
          <p className="muted mt-2">.</p>
          <div className="mt-4 flex gap-3">
            <a href="/stats" className="px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white">Открыть статистику</a>
            <a href="/stats?tab=users" className="px-4 py-2 rounded-lg bg-camo-700/80 hover:bg-camo-600 text-neutral-200">По пользователям</a>
          </div>
        </section>
      </div>
    </>
  );
}

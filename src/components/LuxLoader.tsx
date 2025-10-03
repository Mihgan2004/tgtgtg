export default function LuxLoader({ label = "Загрузка..." }:{label?:string}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-camo-900/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="loader-ring" />
        <div className="text-sm text-neutral-300">{label}</div>
      </div>
    </div>
  )
}

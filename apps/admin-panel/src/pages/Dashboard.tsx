import { TeamOutlined, SafetyCertificateOutlined, ThunderboltOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useAppSelector } from "@repo/shared";

// Sample numbers — replace with data from your API
const stats = [
  { label: "Active users", value: "2,481", trend: "+12.4%", up: true, icon: <TeamOutlined /> },
  { label: "Requests today", value: "48.2k", trend: "+3.1%", up: true, icon: <ThunderboltOutlined /> },
  { label: "Open grants", value: "36", trend: "-2", up: false, icon: <SafetyCertificateOutlined /> },
  { label: "Avg. response", value: "182 ms", trend: "-8.0%", up: true, icon: <ClockCircleOutlined /> },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user)!;
  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <header>
        <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-content">{greeting()}, <span className="text-primary">{user.firstname}</span> !</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <article key={s.label} className="group rounded-2xl border border-line bg-page/60 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{s.label}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">{s.icon}</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-semibold tracking-tight text-content">{s.value}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.up ? "bg-secondary/15 text-secondary" : "bg-red-500/10 text-red-500"}`}>{s.trend}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-page/60 p-6">
          <h2 className="font-semibold text-content">Your account</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            {[["Name", `${user.firstname} ${user.lastname}`], ["Email", user.email], ["User ID", String(user.userId)]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium text-content">{v}</dd></div>
            ))}
          </dl>
        </article>
        <article className="rounded-2xl border border-line bg-page/60 p-6">
          <h2 className="font-semibold text-content">Grants</h2>
          <p className="mt-1 text-sm text-muted">What this account is allowed to do.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user?.grants?.map((g) => (
              <span key={g.name} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{g.name}</span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

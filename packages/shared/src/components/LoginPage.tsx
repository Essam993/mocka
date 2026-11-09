import { useState, type FormEvent, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store";
import { clearAuthError, login, type LoginPayload } from "../auth/authSlice";
import { Input, PasswordInput } from "./Input";
import { AppearanceButton } from "./AppearanceModal";
import { ThemeToggle } from "./ThemeToggle";

interface LoginPageProps {
  /** Product name, e.g. "Mocka" */
  title: string;
  /** One-line pitch shown on the info card */
  subtitle?: string;
  /** Small text above the pitch, e.g. "by Tangerine Digital" */
  subText?: string;
  /** Short bullet points shown on the info card (desktop) */
  highlights?: string[];
  /** Rendered under the form, e.g. "Don't have an account? Sign up" */
  footer?: ReactNode;
  /** Links in the page footer, e.g. Terms / Privacy / Help */
  links?: { label: string; href: string }[];
  logo?: ReactNode;
  onSuccess: () => void;
}

type Step = "username" | "password";

/** Big ring + glow behind the card. Uses the theme variables, so it follows light/dark and the accent. */
const ring = {
  background: "radial-gradient(circle at 50% 45%, rgb(var(--color-secondary) / 0.10), transparent 62%)",
  maskImage: "linear-gradient(#000 50%, transparent 98%)",
  WebkitMaskImage: "linear-gradient(#000 50%, transparent 98%)",
};

/**
 * Shared two-step sign-in: email / username first, password second, in the same card.
 * Appearance + theme toggle are available before signing in.
 */
export function LoginPage({ title, subtitle, subText, highlights = [], footer, links = [], logo, onSuccess }: LoginPageProps) {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState<Step>("username");

  const { control, handleSubmit, setValue, getValues, trigger, watch, formState: { errors } } = useForm<LoginPayload>({
    defaultValues: { username: "", password: "" },
  });
  const username = watch("username");
  const loading = status === "loading";

  const submit = (values: LoginPayload) => dispatch(login(values)).unwrap().then(onSuccess).catch(() => undefined);

  // Browser autofill / password managers can fill inputs without firing React events, so RHF still
  // thinks they're empty. Copy the real DOM values into the form right before validating.
  const syncAutofill = (form: HTMLFormElement) => {
    const data = new FormData(form);
    (["username", "password"] as const).forEach((name) => {
      const value = data.get(name);
      if (typeof value === "string" && value) setValue(name, value);
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    syncAutofill(e.currentTarget);

    if (step === "username") {
      // only the username is checked here; the password comes next
      if (await trigger("username")) {
        dispatch(clearAuthError());
        setStep("password");
      }
      return;
    }
    return handleSubmit(submit)(e);
  };

  const changeUser = () => {
    setValue("password", "");
    dispatch(clearAuthError());
    setStep("username");
  };

  const showInfo = highlights.length > 0 || !!subtitle;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-page">
      {/* ring backdrop */}

      {/* Ring backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-1/2 size-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line"
          style={ring}
        />
      </div>


      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <AppearanceButton label="Appearance" />
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`grid w-full items-center gap-6 ${showInfo ? "max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]" : "max-w-md"}`}>
          {/* ------------------------------ sign-in card ------------------------------ */}
          <form
            onSubmit={onSubmit}
            noValidate
            aria-label="Sign in"
            className="rounded-3xl border border-line bg-surface p-7 shadow-soft motion-safe:animate-fade-up md:p-9"
          >
            {logo && <div className="mb-5">{logo}</div>}

            <div key={step} className="motion-safe:animate-fade-up">
              {step === "username" ? (
                <>
                  <h1 className="text-3xl font-semibold tracking-tight text-content">Sign in to {title}</h1>
                  <p className="mt-2 text-muted">Welcome back. Enter your email to continue.</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold tracking-tight text-content">Enter your password</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="max-w-full truncate rounded-full border border-line bg-content/5 px-3 py-1 text-sm text-content">{username}</span>
                    <button
                      type="button"
                      onClick={changeUser}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <ArrowLeftOutlined className="text-xs" /> Use a different account
                    </button>
                  </div>
                </>
              )}
            </div>

            {step === "password" && error && (
              <Alert type="error" showIcon message={error} closable onClose={() => dispatch(clearAuthError())} className="mt-5" />
            )}

            <div className="mt-7 flex flex-col gap-4">
              {step === "username" ? (
                <Controller
                  name="username"
                  control={control}
                  rules={{ required: "Enter your email or username" }}
                  render={({ field }) => <Input {...field} label="Email" autoComplete="username" autoFocus error={errors.username?.message} />}
                />
              ) : (
                <>
                  {/* keeps the username in the form so password managers can match the saved login */}
                  <input type="text" name="username" value={getValues("username")} readOnly autoComplete="username" tabIndex={-1} aria-hidden className="sr-only" />
                  <Controller
                    name="password"
                    control={control}
                    rules={{ required: "Enter your password" }}
                    render={({ field }) => <PasswordInput {...field} label="Password" autoComplete="current-password" autoFocus error={errors.password?.message} />}
                  />
                </>
              )}

              <Button type="primary" htmlType="submit" size="large" loading={loading} block className="!h-12 !text-base">
                {step === "username" ? "Continue" : "Sign in"}
              </Button>
            </div>

            {/* step dots */}
            <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden>
              {(["username", "password"] as Step[]).map((s) => (
                <span key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-6 bg-primary" : "w-1.5 bg-content/20"}`} />
              ))}
            </div>

            {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
          </form>

          {/* -------------------------------- info panel -------------------------------- */}
          {showInfo && (
            <aside className="hidden space-y-4 lg:block">
              <section className="rounded-3xl border border-line bg-surface/70 p-7 backdrop-blur-sm">
                {subText && <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-primary">{subText}</p>}
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-content">{subtitle ?? title}</h2>
                {highlights.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-start gap-3 text-content/85">
                        <CheckOutlined className="mt-1 text-sm text-primary" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          )}
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 pb-8 text-sm text-muted">
        {links.map((l) => (
          <a key={l.label} href={l.href} className="hover:text-content hover:underline">{l.label}</a>
        ))}
        <span>© {new Date().getFullYear()} {title}</span>
      </footer>
    </div>
  );
}

import { useEffect, type FormEvent, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, message, theme } from "antd";
import { CheckOutlined } from "@ant-design/icons";

import { Input } from "../components/Input";
import { useAppDispatch, useAppSelector } from "../store";
import { resetSignup, signupUser } from "../store/slice/signupSlice";
import { AppearanceButton } from "./AppearanceModal";
import { ThemeToggle } from "./ThemeToggle";

interface FormValues {
  firstName: string;
  lastName: string;
  userName: string;
  passWord: string;
  confirmPassword: string;
}

interface SignupPageProps {
  /** Product name, e.g. "Mocka" */
  title?: string;
  /** One-line pitch shown on the info card */
  subtitle?: string;
  /** Small text above the pitch, e.g. "by Tangerine Digital" */
  subText?: string;
  /** Short bullet points shown on the info card */
  highlights?: string[];
  /** Called after a successful signup */
  onSuccess: () => void;
  /** Rendered under the form, e.g. "Already have an account? Sign in" */
  footer?: ReactNode;
  /** Links in the page footer, e.g. Terms / Privacy / Help */
  links?: { label: string; href: string }[];
  logo?: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Background                                                                 */
/* -------------------------------------------------------------------------- */

const ring = {
  background:
    "radial-gradient(circle at 50% 45%, rgb(var(--color-secondary) / 0.10), transparent 62%)",
  maskImage: "linear-gradient(#000 50%, transparent 98%)",
  WebkitMaskImage: "linear-gradient(#000 50%, transparent 98%)",
};

/* -------------------------------------------------------------------------- */
/* Password strength                                                          */
/* -------------------------------------------------------------------------- */

const MIN_LENGTH = 8;

const COMMON = [
  "password",
  "12345678",
  "123456789",
  "qwerty123",
  "iloveyou",
  "admin123",
  "letmein1",
];

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthScore;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
  missing: string[];
}

export function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) {
    return { score: 0, label: "", missing: [] };
  }

  const checks = {
    length: pw.length >= MIN_LENGTH,
    mixedCase: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const longBonus = pw.length >= 12 && passed >= 3 ? 1 : 0;

  let score = Math.min(4, passed + longBonus);

  if (!checks.length || COMMON.includes(pw.toLowerCase())) {
    score = Math.min(score, 1);
  }

  const missing: string[] = [];

  if (!checks.length) missing.push(`${MIN_LENGTH}+ characters`);
  if (!checks.mixedCase) missing.push("upper & lowercase letters");
  if (!checks.number) missing.push("a number");
  if (!checks.symbol) missing.push("a symbol");

  const labels = ["", "Weak", "Fair", "Good", "Strong"] as const;

  return {
    score: score as StrengthScore,
    label: labels[score],
    missing,
  };
}

function StrengthMeter({ value }: { value: string }) {
  const { token } = theme.useToken();
  const { score, label, missing } = getPasswordStrength(value);

  if (!value) return null;

  const colors = [
    "",
    token.colorError,
    token.colorWarning,
    token.colorInfo,
    token.colorSuccess,
  ];

  const color = colors[score];

  return (
    <div className="-mt-2 space-y-1.5" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background:
                  segment <= score ? color : token.colorBorderSecondary,
              }}
            />
          ))}
        </div>

        <span
          className="w-12 text-right text-xs font-medium"
          style={{ color }}
        >
          {label}
        </span>
      </div>

      {missing.length > 0 && score < 4 && (
        <p className="text-xs text-muted">
          Add {missing.join(", ")} to make it stronger.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Signup page                                                                */
/* -------------------------------------------------------------------------- */

export function SignupPage({
  logo,
  title = "Create your account",
  subtitle,
  subText,
  highlights = [],
  onSuccess,
  footer,
  links = [],
}: SignupPageProps) {
  const dispatch = useAppDispatch();
  const { token } = theme.useToken();
  const { status, error } = useAppSelector((state) => state.signup);

  const loading = status === "loading";
  const showInfo = highlights.length > 0 || Boolean(subtitle);

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      userName: "",
      passWord: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const password = watch("passWord");
  const confirm = watch("confirmPassword");

  const passwordsMatch =
    confirm.length > 0 && confirm === password;

  useEffect(() => {
    dispatch(resetSignup());
  }, [dispatch]);

  const submit = handleSubmit(async (values) => {
    try {
      await dispatch(
        signupUser({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          userName: values.userName.trim(),
          passWord: values.passWord,
          confirmPassword: values.confirmPassword,
        }),
      ).unwrap();

      message.success("Account created. Please log in.");
      onSuccess();
    } catch {
      // The signup error is displayed using the Redux state below.
    }
  });

  /**
   * Sync browser autofill values with React Hook Form before validation.
   */
  const syncAutofill = (form: HTMLFormElement) => {
    const formData = new FormData(form);

    (
      [
        "firstName",
        "lastName",
        "userName",
        "passWord",
        "confirmPassword",
      ] as const
    ).forEach((fieldName) => {
      const fieldValue = formData.get(fieldName);

      if (typeof fieldValue === "string" && fieldValue) {
        setValue(fieldName, fieldValue, {
          shouldValidate: false,
        });
      }
    });
  };

  const onFormSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    syncAutofill(event.currentTarget);

    // Validate the synchronized values before submitting.
    const isValid = await trigger();

    if (isValid) {
      await submit();
    }
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-page">
      {/* Background ring */}

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


      {/* Appearance and theme controls */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <AppearanceButton label="Appearance" />
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div
          className={`grid w-full items-center gap-6 ${showInfo
              ? "max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]"
              : "max-w-xl"
            }`}
        >
          {/* Signup card */}
          <form
            onSubmit={onFormSubmit}
            noValidate
            aria-label="Create account"
            className="rounded-3xl border border-line bg-surface p-6 shadow-soft motion-safe:animate-fade-up md:p-9"
          >
            {logo && <div className="mb-5">{logo}</div>}

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-content">
                {title}
              </h1>

              <p className="mt-2 text-muted">
                {subtitle
                  ? "Join us and get started."
                  : "Create your account to get started."}
              </p>
            </div>

            {/* API error */}
            {error && (
              <Alert
                type="error"
                showIcon
                message={error}
                closable
                onClose={() => dispatch(resetSignup())}
                className="mt-5"
              />
            )}

            <div className="mt-7 flex flex-col gap-4">
              {/* First name and last name */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="firstName"
                  control={control}
                  rules={{
                    required: "Enter your first name",
                    maxLength: {
                      value: 50,
                      message: "At most 50 characters",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="First name"
                      required
                      autoComplete="given-name"
                      autoFocus
                      error={errors.firstName?.message}
                    />
                  )}
                />

                <Controller
                  name="lastName"
                  control={control}
                  rules={{
                    required: "Enter your last name",
                    maxLength: {
                      value: 50,
                      message: "At most 50 characters",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Last name"
                      required
                      autoComplete="family-name"
                      error={errors.lastName?.message}
                    />
                  )}
                />
              </div>

              {/* Email */}
              <Controller
                name="userName"
                control={control}
                rules={{
                  required: "Enter your email",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="email"
                    label="Email"
                    required
                    autoComplete="username"
                    error={errors.userName?.message}
                  />
                )}
              />

              {/* Password */}
              <Controller
                name="passWord"
                control={control}
                rules={{
                  required: "Enter a password",
                  minLength: {
                    value: MIN_LENGTH,
                    message: `At least ${MIN_LENGTH} characters`,
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="password"
                    label="Password"
                    required
                    autoComplete="new-password"
                    error={errors.passWord?.message}
                    onChange={(event) => {
                      field.onChange(event);

                      if (getValues("confirmPassword")) {
                        void trigger("confirmPassword");
                      }
                    }}
                  />
                )}
              />

              <StrengthMeter value={password} />

              {/* Confirm password */}
              <Controller
                name="confirmPassword"
                control={control}
                rules={{
                  required: "Confirm your password",
                  validate: (value) =>
                    value === getValues("passWord") ||
                    "Passwords do not match",
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="password"
                    label="Confirm password"
                    required
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />

              {passwordsMatch && !errors.confirmPassword && (
                <p
                  className="-mt-2 text-xs font-medium"
                  style={{ color: token.colorSuccess }}
                  aria-live="polite"
                >
                  Passwords match
                </p>
              )}

              {/* Create account */}
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                className="!mt-1 !h-12 !text-base"
              >
                Create account
              </Button>
            </div>

            {/* Login link or custom footer */}
            {footer && (
              <div className="mt-5 text-center text-sm text-muted">
                {footer}
              </div>
            )}
          </form>

          {/* Info panel — same layout as LoginPage */}
          {showInfo && (
            <aside className="hidden space-y-4 lg:block">
              <section className="rounded-3xl border border-line bg-surface/70 p-7 backdrop-blur-sm">
                {subText && (
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-primary">
                    {subText}
                  </p>
                )}

                <h2 className="mt-3 text-xl font-semibold tracking-tight text-content">
                  {subtitle ?? title}
                </h2>

                {highlights.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-start gap-3 text-content/85"
                      >
                        <CheckOutlined className="mt-1 text-sm text-primary" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          )}
        </div>
      </main>

      {/* Page footer */}
      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 pb-8 text-sm text-muted">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="hover:text-content hover:underline"
          >
            {link.label}
          </a>
        ))}

        <span>
          © {new Date().getFullYear()} {title}
        </span>
      </footer>
    </div>
  );
}

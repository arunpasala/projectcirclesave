"use client";

type Props = {
  password: string;
};

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) {
    return {
      label: "Enter a password",
      width: "0%",
      barClass: "bg-slate-200",
      textClass: "text-slate-500",
      tips: ["Use at least 8 characters."],
    };
  }

  if (score <= 2) {
    return {
      label: "Weak",
      width: "25%",
      barClass: "bg-red-500",
      textClass: "text-red-600",
      tips: ["Add uppercase, numbers, and symbols."],
    };
  }

  if (score <= 4) {
    return {
      label: "Medium",
      width: "60%",
      barClass: "bg-amber-500",
      textClass: "text-amber-600",
      tips: ["Use 12+ characters and avoid common words."],
    };
  }

  return {
    label: "Strong",
    width: "100%",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-600",
    tips: ["Good length and variety. Keep it unique."],
  };
}

export default function PasswordStrength({ password }: Props) {
  const strength = getPasswordStrength(password);

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Password strength
        </span>
        <span className={`text-xs font-semibold ${strength.textClass}`}>
          {strength.label}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
          style={{ width: strength.width }}
        />
      </div>

      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        {strength.tips.map((tip) => (
          <li key={tip}>• {tip}</li>
        ))}
      </ul>
    </div>
  );
}
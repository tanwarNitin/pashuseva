import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: dict.auth.register.title,
    description: dict.auth.register.subtitle,
  };
}

export default async function RegisterPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{dict.auth.register.title}</h1>
            <p className="mt-2 text-gray-600">{dict.auth.register.subtitle}</p>
          </div>
          <RegisterForm locale={locale} dict={dict.auth} />
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          {dict.auth.register.hasAccount}
          <a href={`/${locale}/login`} className="font-medium text-primary-600 hover:text-primary-500 ml-1">
            {dict.auth.register.loginLink}
          </a>
        </p>
      </div>
    </main>
  );
}
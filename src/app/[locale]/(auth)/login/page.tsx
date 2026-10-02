import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import Image from "next/image";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: dict.auth.login.title,
    description: dict.auth.login.subtitle,
  };
}

export default async function LoginPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* Left/Top Branding Panel */}
      <div className="w-full md:w-1/2 bg-emerald-900 p-6 md:p-12 flex flex-col justify-between gap-4 md:gap-0 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2 md:mb-6">
            <div className="bg-white p-1.5 rounded-xl shadow-sm inline-flex">
              <Image src="/images/icon-192.png" alt="Logo" width={48} height={48} className="rounded-lg" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              {dict.common.appName}
            </h1>
          </div>
          <p className="text-emerald-50 text-base md:text-2xl max-w-md font-medium leading-relaxed">
            {dict.auth.login.purpose}
          </p>
        </div>
        
        <div className="hidden md:block">
          <p className="text-emerald-200/90 text-sm max-w-sm font-medium leading-relaxed">
            {dict.auth.login.trust}
          </p>
        </div>
      </div>

      {/* Right/Bottom Form Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 flex-1">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center md:text-left mb-8 md:mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{dict.auth.login.title}</h2>
            <p className="text-gray-500 text-sm">{dict.auth.login.subtitle}</p>
          </div>
          
          <LoginForm locale={locale} dict={dict.auth} />
          
          <div className="mt-8 text-center md:text-left text-sm text-gray-600">
            {dict.auth.login.noAccount}
            <a href={`/${locale}/register`} className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline ml-2">
              {dict.auth.login.registerLink}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
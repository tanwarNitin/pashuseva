import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
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
    title: dict.auth.login.title,
    description: dict.auth.login.subtitle,
  };
}

export default async function LoginPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left/Top Branding Panel */}
      <div className="md:w-1/2 bg-primary p-8 md:p-12 flex flex-col justify-between hidden md:flex relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {dict.common.appName}
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            {dict.auth.login.subtitle}
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-24 w-72 h-72 bg-primary-foreground/10 rounded-full blur-2xl"></div>
      </div>

      {/* Right/Bottom Form Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background flex-1">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center md:text-left mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{dict.auth.login.title}</h2>
            <p className="text-muted-foreground block md:hidden">{dict.auth.login.subtitle}</p>
          </div>
          
          <LoginForm locale={locale} dict={dict.auth} />
          
          <div className="mt-8 text-center md:text-left text-sm text-muted-foreground">
            {dict.auth.login.noAccount}
            <a href={`/${locale}/register`} className="font-medium text-primary hover:underline ml-2">
              {dict.auth.login.registerLink}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
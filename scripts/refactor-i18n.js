const fs = require('fs');
const path = require('path');

const files = [
  'src/app/[locale]/discover/discovery-client.tsx',
  'src/components/farmer/discovery-map.tsx',
  'src/components/farmer/sos-creation-modal.tsx',
  'src/components/farmer/request-tracking-client.tsx',
  'src/app/[locale]/cattle/[id]/health-card-client.tsx'
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping missing file:', file);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import { useTranslation } from "react-i18next";
  content = content.replace(/import\s+{\s*useTranslation\s*}\s+from\s+["']react-i18next["'];/g, 'import { useTranslation } from "@/i18n/client";');
  
  // Replace const { t } = useTranslation(); with const dict = useTranslation();
  content = content.replace(/const\s+{\s*t\s*}\s*=\s*useTranslation\(\);/g, 'const dict = useTranslation();');
  
  // Replace t("a.b") with dict.a.b
  content = content.replace(/t\(\s*["']([^"']+)["']\s*\)/g, (match, key) => {
    return `dict.${key}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed', file);
}

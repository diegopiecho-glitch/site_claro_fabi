import { ReactNode } from 'react';

interface SocialButtonProps {
  icon: ReactNode;
  label: string;
  href: string;
  color: string;
}

export function SocialButton({ icon, label, href, color }: SocialButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${color} text-white px-6 py-3 rounded-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

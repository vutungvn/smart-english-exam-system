import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { BrandPattern } from '@/components/brand/BrandPattern';
import { useLandingSession } from '../use-landing-session';
import { EnterAppLink } from './EnterAppLink';
import { Section } from './Section';

export function FinalCta() {
  const session = useLandingSession();

  return (
    <Section className="pt-4 lg:pt-8">
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-brand via-primary to-primary-light px-6 py-14 text-center text-white shadow-2xl shadow-primary/25 sm:px-12 lg:py-20">
        <BrandPattern />
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Sẵn sàng chinh phục TOEIC?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-balance text-blue-100 sm:text-lg">
            {session.state === 'signed-in'
              ? 'Tiếp tục lộ trình luyện thi và làm thêm một bài thi thử hôm nay.'
              : 'Tạo tài khoản và làm bài thi thử đầu tiên ngay hôm nay.'}
          </p>
          {session.state === 'signed-in' ? (
            <div className="mt-9 flex justify-center">
              <EnterAppLink
                to={session.homePath}
                label={session.enterLabel}
                tone="light"
                className="h-13 px-8"
              />
            </div>
          ) : (
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex h-13 items-center gap-2 rounded-xl bg-white px-8 font-semibold whitespace-nowrap text-brand shadow-lg shadow-black/10 transition hover:bg-blue-50"
              >
                Đăng ký
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-white/90 transition hover:text-white"
              >
                Tôi đã có tài khoản
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

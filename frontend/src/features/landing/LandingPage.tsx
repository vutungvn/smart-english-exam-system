import { CoursesSection } from './components/CoursesSection';
import { DataSafetySection } from './components/DataSafetySection';
import { FaqSection } from './components/FaqSection';
import { FeaturesSection } from './components/FeaturesSection';
import { FinalCta } from './components/FinalCta';
import { HeroSection } from './components/HeroSection';
import { LandingFooter } from './components/LandingFooter';
import { LandingHeader } from './components/LandingHeader';
import { RoadmapSection } from './components/RoadmapSection';
import { SkillsSection } from './components/SkillsSection';
import { TeacherSection } from './components/TeacherSection';

// Trang chủ công khai ở `/` (theo Stitch, màn "Landing page 2"), cho khách chưa đăng nhập
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <title>Smart English Exam – Luyện thi TOEIC 4 kỹ năng cùng AI</title>
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SkillsSection />
        <RoadmapSection />
        <CoursesSection />
        <TeacherSection />
        <DataSafetySection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

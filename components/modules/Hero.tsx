"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useEffect, useState, useRef, useCallback } from "react";
import type { SiteSettings, HeroDisplayConfig, FeaturedSlide } from "@/types";
import Image from "next/image";
import { ArrowRight, ArrowDown, Truck, ShieldCheck, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { getText } from "@/lib/textDefaults";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: easeOut },
  },
};

const slideIn = {
  hidden: { x: 60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 1, ease: easeOut, delay: 0.2 },
  },
};

const badges = [
  { icon: Truck, label: "Same-Day Delivery" },
  { icon: ShieldCheck, label: "Quality Guaranteed" },
  { icon: Leaf, label: "Fresh & Premium" },
];

interface ResolvedFeaturedSlide extends FeaturedSlide {
  _imageUrl?: string;
}

interface HeroProps {
  customTexts?: Record<string, string>;
  settings?: SiteSettings | null;
  heroMedia?: { id: string; url: string; type: string }[];
  featuredSlides?: ResolvedFeaturedSlide[];
}

export default function Hero({ customTexts, settings, heroMedia = [], featuredSlides = [] }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, -60]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const displayConfig: HeroDisplayConfig = settings?.heroDisplayConfig || {
    mode: "single",
    mediaIds: [],
    slideshowInterval: 5,
  };

  const useFeatured = displayConfig.useFeaturedSlides && featuredSlides.length > 0;

  // Slideshow auto-advance
  const slideCount = useFeatured ? featuredSlides.length : heroMedia.length;
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const shouldAutoAdvance = useFeatured ? featuredSlides.length > 1 : (displayConfig.mode === "slideshow" && heroMedia.length > 1);
    if (shouldAutoAdvance) {
      timerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slideCount);
      }, (displayConfig.slideshowInterval || 5) * 1000);
    }
  }, [displayConfig.mode, displayConfig.slideshowInterval, slideCount, useFeatured, featuredSlides.length, heroMedia.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goToSlide = (dir: -1 | 1) => {
    setCurrentSlide((prev) => (prev + dir + slideCount) % slideCount);
    startTimer();
  };

  const headingText = settings?.heroHeading || getText(customTexts, "hero.heading");
  const subheading = settings?.heroSubheading || getText(customTexts, "hero.subheading");
  const ctaText = settings?.heroCtaText || getText(customTexts, "hero.cta");
  const ctaLink = settings?.heroCtaLink || "/shop";
  const heroImage = settings?.heroImage;

  const hasGalleryMedia = heroMedia.length > 0;
  const showVideo = !useFeatured && displayConfig.mode === "video" && hasGalleryMedia && heroMedia[0]?.type === "video";
  const showSlideshow = !useFeatured && displayConfig.mode === "slideshow" && heroMedia.length > 0;
  const showSingleGallery = !useFeatured && displayConfig.mode === "single" && hasGalleryMedia;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-dvh overflow-hidden bg-brand-black"
    >
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(53,94,59,0.3) 0.5px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 min-h-dvh grid grid-cols-1 lg:grid-cols-2">
        {/* Left — Text content */}
        <motion.div
          style={{ opacity: contentOpacity, y: contentY }}
          className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 pt-28 pb-10 lg:pt-0 lg:pb-0 order-2 lg:order-1"
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-xl"
          >
            <motion.div variants={fadeUp} className="mb-5">
              <span className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-warm-cream/60 font-semibold">
                <span className="w-6 h-[2px] bg-brand-green rounded-full" />
                Premium Meat Delivery
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-serif text-[clamp(2.2rem,5.5vw,4.5rem)] text-warm-cream leading-[1.08] tracking-tight mb-5"
            >
              {headingText || (
                <>
                  The Finest Cuts,{" "}
                  <span className="text-brand-red">Delivered Fresh</span> to
                  Your Door
                </>
              )}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-[15px] md:text-base text-warm-cream/60/70 max-w-md leading-relaxed mb-8"
            >
              {subheading}
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-4 items-center mb-10"
            >
              <Link href={ctaLink}>
                <Button
                  size="lg"
                  className="!bg-brand-red !text-white hover:!bg-[#a8311f] px-9 tracking-wider shadow-lg shadow-brand-red/20 hover:shadow-brand-red/30 transition-all duration-300"
                >
                  {ctaText}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link
                href="/bundles"
                className="group flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-warm-cream/50 hover:text-brand-red transition-colors duration-300"
              >
                <span className="relative">
                  Build Your Box
                  <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-brand-red origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                </span>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-x-6 gap-y-3">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-warm-cream/40"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-green/[0.06] flex items-center justify-center">
                    <badge.icon size={14} strokeWidth={1.5} className="text-brand-green" />
                  </div>
                  <span className="text-[11px] font-medium tracking-wide uppercase">
                    {badge.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right — Media panel */}
        <motion.div
          variants={slideIn}
          initial="hidden"
          animate="visible"
          className="relative order-1 lg:order-2 h-[45vh] lg:h-auto"
        >
          <motion.div
            style={{ y: imageY }}
            className="absolute inset-0 lg:left-0 lg:rounded-bl-[3rem] overflow-hidden"
          >
            {/* Featured Slides Mode */}
            {useFeatured && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.8, ease: easeOut }}
                    className="absolute inset-0"
                  >
                    {(() => {
                      const slide = featuredSlides[currentSlide];
                      if (!slide) return null;
                      const imgUrl = slide._imageUrl || slide.mediaUrl || slide.promoImageUrl;
                      const isVideo = slide.mediaType === "video";
                      return (
                        <>
                          {isVideo && imgUrl ? (
                            <video src={imgUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          ) : imgUrl ? (
                            <Image src={imgUrl} alt={slide.headline || "Featured"} fill className="object-cover" priority={currentSlide === 0} sizes="50vw" />
                          ) : (
                            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_#3D2010_0%,_#2C1A0E_60%,_#1A0F07_100%)]" />
                          )}
                          <FeaturedOverlay slide={slide} />
                        </>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>

                {featuredSlides.length > 1 && (
                  <>
                    <button
                      onClick={() => goToSlide(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => goToSlide(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                      {featuredSlides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentSlide(i); startTimer(); }}
                          className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                            i === currentSlide ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {showVideo && (
              <video
                src={heroMedia[0].url}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {showSlideshow && !showVideo && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.8, ease: easeOut }}
                    className="absolute inset-0"
                  >
                    {heroMedia[currentSlide]?.type === "video" ? (
                      <video
                        src={heroMedia[currentSlide].url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={heroMedia[currentSlide]?.url || ""}
                        alt="Hero media"
                        fill
                        className="object-cover"
                        priority={currentSlide === 0}
                        sizes="50vw"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {heroMedia.length > 1 && (
                  <>
                    <button
                      onClick={() => goToSlide(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => goToSlide(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                      {heroMedia.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentSlide(i); startTimer(); }}
                          className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                            i === currentSlide ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {showSingleGallery && !showVideo && !showSlideshow && (
              heroMedia[0].type === "video" ? (
                <video
                  src={heroMedia[0].url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={heroMedia[0].url}
                  alt="Hero media"
                  fill
                  className="object-cover"
                  priority
                  sizes="50vw"
                />
              )
            )}

            {!hasGalleryMedia && (
              heroImage ? (
                <Image
                  src={heroImage}
                  alt="Premium cuts of meat"
                  fill
                  className="object-cover"
                  priority
                  sizes="50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3D2010_0%,_#2C1A0E_60%,_#1A0F07_100%)]" />
              )
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent lg:bg-none lg:hidden z-10" />
            <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-brand-black/20 to-transparent w-24 z-10" />
            <div className="hidden lg:block absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-white/10 rounded-bl-xl z-10" />
            <div className="hidden lg:block absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-white/10 rounded-tr-xl z-10" />

            <div className="hidden lg:flex absolute bottom-8 right-8 items-center gap-2 bg-deep-espresso/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/70 font-medium">
                Lagos, Nigeria
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.button
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          onClick={() => {
            const next = sectionRef.current?.nextElementSibling;
            next?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1.5 text-warm-cream/20 hover:text-brand-red/40 transition-colors cursor-pointer"
        >
          <span className="text-[9px] uppercase tracking-[0.3em]">Explore</span>
          <ArrowDown size={14} strokeWidth={1.5} />
        </motion.button>
      </motion.div>
    </section>
  );
}

function FeaturedOverlay({ slide }: { slide: ResolvedFeaturedSlide }) {
  if (!slide.headline && !slide.subtitle && !slide.ctaText) return null;

  const posClass = {
    "bottom-left": "bottom-6 left-6",
    "bottom-right": "bottom-6 right-6",
    "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center",
    "top-left": "top-6 left-6",
  }[slide.overlayPosition || "bottom-left"];

  if (slide.overlayStyle === "gradient") {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-20 z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          {slide.headline && <h3 className="font-serif text-xl md:text-2xl text-white font-bold leading-tight">{slide.headline}</h3>}
          {slide.subtitle && <p className="text-sm text-white/70 mt-1 max-w-sm">{slide.subtitle}</p>}
          {slide.ctaText && slide.ctaLink && (
            <Link href={slide.ctaLink} className="inline-flex items-center gap-2 mt-3 text-xs uppercase tracking-wider text-white/90 font-semibold hover:text-white transition-colors group">
              {slide.ctaText} <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </motion.div>
      </div>
    );
  }

  const bgClass = slide.overlayStyle === "light"
    ? "bg-white/80 backdrop-blur-md text-brand-dark"
    : "bg-black/60 backdrop-blur-md text-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className={`absolute ${posClass} ${bgClass} rounded-xl px-5 py-4 max-w-[75%] z-10`}
    >
      {slide.headline && <h3 className="font-serif text-lg font-bold leading-tight">{slide.headline}</h3>}
      {slide.subtitle && <p className="text-xs opacity-70 mt-1">{slide.subtitle}</p>}
      {slide.ctaText && slide.ctaLink && (
        <Link href={slide.ctaLink} className="inline-flex items-center gap-1.5 mt-2 text-[10px] uppercase tracking-wider font-semibold opacity-80 hover:opacity-100 transition-opacity group">
          {slide.ctaText} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}

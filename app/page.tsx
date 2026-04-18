import Header from "@/components/modules/Header";
import Hero from "@/components/modules/Hero";
import PromiseBar from "@/components/modules/PromiseBar";
import NewArrivals from "@/components/modules/NewArrivals";
import ShopByCategory from "@/components/modules/ShopByCategory";
import HomeCta from "@/components/modules/HomeCta";
import AboutSnippet from "@/components/modules/AboutSnippet";
import Footer from "@/components/modules/Footer";
import { getNewProducts, getCategories, getSiteSettings, getMediaByIds, getProductsByIds } from "@/lib/queries";
import { SettingsProvider } from "@/lib/SettingsProvider";

export const revalidate = 60; // ISR: rebuild at most once per minute

export default async function Home() {
  const [newProducts, categories, settings] = await Promise.all([
    getNewProducts(),
    getCategories(),
    getSiteSettings(),
  ]);

  // Resolve hero media URLs server-side so Hero doesn't need to fetch
  const heroMediaIds = settings?.heroDisplayConfig?.mediaIds || [];
  const heroMedia = heroMediaIds.length > 0 ? await getMediaByIds(heroMediaIds) : [];

  // Resolve featured slides — products + media URLs
  const rawSlides = (settings?.featuredSlides || []).filter((s: any) => s.isActive);
  let featuredSlides: any[] = [];
  if (settings?.heroDisplayConfig?.useFeaturedSlides && rawSlides.length > 0) {
    const productIds = rawSlides.filter((s: any) => s.type === "product" && s.productId).map((s: any) => s.productId);
    const mediaIds = rawSlides.filter((s: any) => s.mediaId).map((s: any) => s.mediaId);
    const [slideProducts, slideMedia] = await Promise.all([
      productIds.length > 0 ? getProductsByIds(productIds) : Promise.resolve([]),
      mediaIds.length > 0 ? getMediaByIds(mediaIds) : Promise.resolve([]),
    ]);
    const productMap = new Map(slideProducts.map((p) => [p.id, p]));
    const mediaMap = new Map(slideMedia.map((m) => [m.id, m]));
    featuredSlides = rawSlides.map((slide: any) => {
      let imageUrl = slide.mediaUrl || slide.promoImageUrl || "";
      if (slide.type === "product" && slide.productId) {
        const prod = productMap.get(slide.productId);
        if (prod?.images?.[0]) imageUrl = prod.images[0];
      }
      if (slide.mediaId) {
        const media = mediaMap.get(slide.mediaId);
        if (media) imageUrl = media.url;
      }
      return { ...slide, _imageUrl: imageUrl };
    });
  }

  const ct = settings?.customTexts;

  return (
    <SettingsProvider settings={settings}>
      <Header />
      <main>
        <Hero customTexts={ct} settings={settings} heroMedia={heroMedia} featuredSlides={featuredSlides} />
        <PromiseBar customTexts={ct} />
        <NewArrivals products={newProducts} customTexts={ct} />
        <ShopByCategory categories={categories} customTexts={ct} />
        <HomeCta customTexts={ct} />
        <AboutSnippet customTexts={ct} />
      </main>
      <Footer customTexts={ct} />
    </SettingsProvider>
  );
}

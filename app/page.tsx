import Header from "@/components/modules/Header";
import Hero from "@/components/modules/Hero";
import PromiseBar from "@/components/modules/PromiseBar";
import NewArrivals from "@/components/modules/NewArrivals";
import ShopByCategory from "@/components/modules/ShopByCategory";
import HomeCta from "@/components/modules/HomeCta";
import AboutSnippet from "@/components/modules/AboutSnippet";
import Footer from "@/components/modules/Footer";
import { getNewProducts, getCategories, getSiteSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [newProducts, categories, settings] = await Promise.all([
    getNewProducts(),
    getCategories(),
    getSiteSettings(),
  ]);

  const ct = settings?.customTexts;

  return (
    <>
      <Header />
      <main>
        <Hero customTexts={ct} />
        <PromiseBar customTexts={ct} />
        <NewArrivals products={newProducts} customTexts={ct} />
        <ShopByCategory categories={categories} customTexts={ct} />
        <HomeCta customTexts={ct} />
        <AboutSnippet customTexts={ct} />
      </main>
      <Footer customTexts={ct} />
    </>
  );
}

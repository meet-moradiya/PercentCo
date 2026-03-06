import Navbar from "@/components/Navbar";
import ClosureNotice from "@/components/ClosureNotice";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Menu from "@/components/Menu";
import FeaturedDishes from "@/components/FeaturedDishes";
import Gallery from "@/components/Gallery";
import Testimonials from "@/components/Testimonials";
import Reservation from "@/components/Reservation";
import Location from "@/components/Location";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <ClosureNotice />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Menu />
        <FeaturedDishes />
        <Gallery />
        <Testimonials />
        <Reservation />
        <Location />
      </main>
      <Footer />
    </>
  );
}

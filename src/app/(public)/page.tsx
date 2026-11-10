import Hero from "@/components/home/Hero";
import Marquee from "@/components/home/Marquee";
import Noticeboard from "@/components/home/Noticeboard";
import Overheard from "@/components/home/Overheard";
import SellerCTA from "@/components/home/SellerCTA";
import Shelf from "@/components/home/Shelf";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <Shelf />
      <Noticeboard />
      <Overheard />
      <SellerCTA />
    </>
  );
}
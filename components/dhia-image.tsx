import Image from "next/image";

interface DhiaImageProps {
  className?: string;
  priority?: boolean;
}

export function DhiaImage({ className = "", priority = false }: DhiaImageProps) {
  return (
    <div className={`relative overflow-hidden border-2 border-white/20 ${className}`}>
      <Image
        alt="الدكتور ضياء العوضي"
        className="object-cover grayscale"
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 320px"
        src="/Dhia.jpg"
      />
    </div>
  );
}
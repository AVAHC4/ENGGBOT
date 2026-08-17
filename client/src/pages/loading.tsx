import { useEffect } from "react";
import { useLocation } from "wouter";
import { BrandedLoader } from "@/components/branded-loader";

export default function LoadingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {

    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
          credentials: "include",
        });

        if (response.ok) {
          setLocation("/chat");
        } else {
          setLocation("/login?error=auth_failed");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setLocation("/login?error=server_error");
      }
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 1500);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_center,_rgb(76_29_149_/_0.22),_transparent_36%),_#030303] flex items-center justify-center px-6">
      <BrandedLoader message="Completing login…" detail="Please wait while we set up your account" />
    </div>
  );
}

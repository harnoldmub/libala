import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Calendar, Heart, Users, Clock } from "lucide-react";
import logoRA from "@/assets/logo-ra.png";

interface GuestData {
  id: number;
  firstName: string;
  lastName: string;
  availability: string;
  partySize: number;
  pdfUrl: string | null;
}

export default function GuestInvitationPage() {
  const { guestId } = useParams<{ guestId: string }>();

  const { data: guest, isLoading, error } = useQuery<GuestData>({
    queryKey: ["/api/invitation/guest", guestId],
    queryFn: async () => {
      const res = await fetch(`/api/invitation/guest/${guestId}`);
      if (!res.ok) throw new Error("Invité non trouvé");
      return res.json();
    },
    enabled: !!guestId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-amber-200 text-lg">Invitation non trouvée</p>
        </div>
      </div>
    );
  }

  const showMarch19 = guest.availability === "19-march" || guest.availability === "both";
  const showMarch21 = guest.availability === "21-march" || guest.availability === "both";
  const isCouple = guest.partySize >= 2;

  const handleDownloadDot = () => {
    if (guest.pdfUrl) {
      window.open(guest.pdfUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-300/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 2}s infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Gold border effect */}
        <div className="absolute -inset-[2px] bg-gradient-to-b from-amber-400 via-amber-500/50 to-amber-400 rounded-2xl" />
        
        <div className="relative bg-[#0d0d18] rounded-2xl p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <img
              src={logoRA}
              alt="Ruth & Arnold"
              className="w-24 h-24 mx-auto"
            />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-serif text-amber-400 mb-1">
            Ruth & Arnold
          </h1>
          <p className="text-amber-200/60 text-sm tracking-[0.3em] uppercase mb-8">
            Vos Invitations
          </p>

          {/* Guest info box */}
          <div className="bg-[#151520] rounded-xl p-5 mb-8 border border-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              {isCouple ? (
                <Users className="w-4 h-4 text-amber-400" />
              ) : (
                <Heart className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-amber-200/70 text-xs uppercase tracking-wider">
                {isCouple ? "Invitation Couple" : "Invitation Personnelle"}
              </span>
            </div>
            
            <h2 className="text-2xl font-serif text-white">
              {guest.firstName} {guest.lastName}
            </h2>
            <p className="text-amber-200/50 text-sm mt-1">
              {isCouple ? "2 personnes" : "1 personne"}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            {showMarch19 && (
              <div>
                <p className="text-amber-300/80 text-xs mb-2 uppercase tracking-widest">
                  Cérémonie de la Dot
                </p>
                {guest.pdfUrl ? (
                  <Button
                    onClick={handleDownloadDot}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold h-14 text-base rounded-xl"
                    data-testid="button-download-19"
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    19 Mars 2026
                    <Download className="w-4 h-4 ml-3" />
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full bg-gray-800 text-gray-500 font-medium h-14 text-base rounded-xl cursor-not-allowed border border-gray-700"
                    data-testid="button-download-19-disabled"
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    19 Mars 2026
                    <span className="ml-3 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                      Bientôt
                    </span>
                  </Button>
                )}
              </div>
            )}

            {showMarch21 && (
              <div>
                <p className="text-amber-300/80 text-xs mb-2 uppercase tracking-widest">
                  Mariage Civil & Religieux
                </p>
                <Button
                  disabled
                  className="w-full bg-gray-800 text-gray-500 font-medium h-14 text-base rounded-xl cursor-not-allowed border border-gray-700"
                  data-testid="button-download-21"
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  21 Mars 2026
                  <span className="ml-3 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                    Coming soon
                  </span>
                </Button>
              </div>
            )}

            {!showMarch19 && !showMarch21 && (
              <div className="text-amber-200/60 text-sm py-4">
                Aucune invitation disponible pour le moment
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-amber-500/10">
            <p className="text-amber-200/40 text-xs">
              Téléchargez vos invitations personnalisées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

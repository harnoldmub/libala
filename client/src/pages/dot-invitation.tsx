import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-white/10 backdrop-blur border-yellow-400/20">
          <p className="text-yellow-100">Invitation non trouvée</p>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <Card className="relative z-10 max-w-lg w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-yellow-400/30 shadow-2xl shadow-yellow-400/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        
        <div className="p-8 text-center">
          <img
            src={logoRA}
            alt="Ruth & Arnold"
            className="w-20 h-20 mx-auto mb-4 opacity-90"
          />
          
          <h1 className="text-2xl md:text-3xl font-serif text-yellow-300 mb-2">
            Ruth & Arnold
          </h1>
          
          <p className="text-yellow-100/60 text-sm tracking-widest uppercase mb-6">
            Vos Invitations
          </p>

          <div className="bg-white/5 rounded-xl p-6 mb-6 border border-yellow-400/10">
            <div className="flex items-center justify-center gap-2 mb-3">
              {isCouple ? (
                <Users className="w-5 h-5 text-yellow-400" />
              ) : (
                <Heart className="w-5 h-5 text-yellow-400" />
              )}
              <span className="text-yellow-100/80 text-sm">
                {isCouple ? "Invitation Couple" : "Invitation Personnelle"}
              </span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-serif text-white mb-1">
              {guest.firstName} {guest.lastName}
            </h2>
            
            <p className="text-yellow-100/50 text-sm">
              {isCouple ? "2 personnes" : "1 personne"}
            </p>
          </div>

          <div className="space-y-3">
            {showMarch19 && (
              <div>
                <p className="text-yellow-100/70 text-xs mb-2 uppercase tracking-wider">
                  Cérémonie de la Dot
                </p>
                {guest.pdfUrl ? (
                  <Button
                    onClick={handleDownloadDot}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium py-6 text-base"
                    data-testid="button-download-19"
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    Invitation du 19 Mars 2026
                    <Download className="w-4 h-4 ml-3" />
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full bg-gray-600/50 text-gray-400 font-medium py-6 text-base cursor-not-allowed"
                    data-testid="button-download-19-disabled"
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    Invitation du 19 Mars 2026
                    <Clock className="w-4 h-4 ml-3" />
                  </Button>
                )}
              </div>
            )}

            {showMarch21 && (
              <div className="mt-4">
                <p className="text-yellow-100/70 text-xs mb-2 uppercase tracking-wider">
                  Mariage Civil & Religieux
                </p>
                <Button
                  disabled
                  className="w-full bg-gray-600/50 text-gray-400 font-medium py-6 text-base cursor-not-allowed"
                  data-testid="button-download-21"
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  Invitation du 21 Mars 2026
                  <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                    Coming soon
                  </span>
                </Button>
              </div>
            )}

            {!showMarch19 && !showMarch21 && (
              <div className="text-yellow-100/60 text-sm py-4">
                Aucune invitation disponible pour le moment
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-yellow-400/10">
            <p className="text-yellow-100/40 text-xs">
              Merci de télécharger vos invitations personnalisées
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      </Card>
    </div>
  );
}

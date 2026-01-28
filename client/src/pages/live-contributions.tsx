import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Gift, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoRA from "@assets/logo-ra.png";
import type { Contribution } from "@shared/schema";

interface LiveData {
  total: number;
  currency: string;
  latest: Contribution | null;
  recent: Contribution[];
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function LiveContributions() {
  const [showPopup, setShowPopup] = useState(false);
  const [newContribution, setNewContribution] = useState<Contribution | null>(null);
  const lastContributionId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: liveData } = useQuery<LiveData>({
    queryKey: ["/api/contributions/live"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (liveData?.latest && liveData.latest.id !== lastContributionId.current) {
      if (lastContributionId.current !== null) {
        setNewContribution(liveData.latest);
        setShowPopup(true);
        
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        setTimeout(() => {
          setShowPopup(false);
        }, 8000);
      }
      lastContributionId.current = liveData.latest.id;
    }
  }, [liveData?.latest]);

  const total = liveData?.total || 0;
  const recent = liveData?.recent || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] text-white relative overflow-hidden">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center mb-12">
          <img
            src={logoRA}
            alt="Ruth & Arnold"
            className="w-32 h-32 mx-auto mb-6 opacity-90"
          />
          <h1 className="text-4xl md:text-5xl font-serif text-yellow-300 mb-2">
            Ruth & Arnold
          </h1>
          <p className="text-xl text-yellow-100/70 font-light tracking-widest">
            CAGNOTTE EN DIRECT
          </p>
        </div>

        <motion.div
          className="relative"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl blur-xl opacity-30" />
          <div className="relative bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl border-2 border-yellow-400/50 rounded-3xl px-16 py-12">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Gift className="w-10 h-10 text-yellow-400" />
              <span className="text-2xl text-yellow-100/80 font-light">Total collecté</span>
              <Gift className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 text-center" data-testid="text-total-amount">
              {formatAmount(total)}
            </div>
          </div>
        </motion.div>

        {recent.length > 0 && (
          <div className="mt-16 w-full max-w-2xl">
            <h2 className="text-xl text-yellow-300/80 text-center mb-6 font-light tracking-widest">
              DERNIÈRES CONTRIBUTIONS
            </h2>
            <div className="space-y-3">
              {recent.slice(0, 5).map((contribution, idx) => (
                <motion.div
                  key={contribution.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-yellow-400/20 rounded-xl px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white" data-testid={`text-donor-name-${idx}`}>
                        {contribution.donorName}
                      </p>
                      {contribution.message && (
                        <p className="text-sm text-yellow-100/60 truncate max-w-xs">
                          "{contribution.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400" data-testid={`text-donor-amount-${idx}`}>
                    {formatAmount(contribution.amount)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPopup && newContribution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative"
            >
              <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400 via-pink-500 to-yellow-400 rounded-full blur-3xl opacity-50 animate-pulse" />
              
              <div className="relative bg-gradient-to-br from-[#2a2a4a] to-[#1a1a3a] border-4 border-yellow-400 rounded-3xl p-12 md:p-16 text-center max-w-lg mx-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-6 -right-6"
                >
                  <Sparkles className="w-12 h-12 text-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-6 -left-6"
                >
                  <Sparkles className="w-12 h-12 text-yellow-400" />
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center"
                >
                  <Heart className="w-12 h-12 text-white" fill="white" />
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-light text-yellow-100 mb-2">
                  Merci
                </h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 mb-6"
                  data-testid="popup-donor-name"
                >
                  {newContribution.donorName}
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-6xl md:text-7xl font-bold text-yellow-400 mb-4"
                  data-testid="popup-donor-amount"
                >
                  {formatAmount(newContribution.amount)}
                </motion.div>

                {newContribution.message && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-xl text-yellow-100/80 italic"
                  >
                    "{newContribution.message}"
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-0 right-0 text-center text-yellow-100/40 text-sm">
        Rafraîchissement automatique toutes les 5 secondes
      </div>
    </div>
  );
}

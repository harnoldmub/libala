import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Gift, Sparkles, Trophy, Crown } from "lucide-react";
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

  const top5 = useMemo(() => {
    return [...recent].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [recent]);

  const scrollingList = useMemo(() => {
    const list = [...recent];
    while (list.length > 0 && list.length < 10) {
      list.push(...recent);
    }
    return list;
  }, [recent]);

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] text-white relative overflow-hidden">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full flex">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <img
              src={logoRA}
              alt="Ruth & Arnold"
              className="w-24 h-24 mx-auto mb-4 opacity-90"
            />
            <h1 className="text-3xl md:text-4xl font-serif text-yellow-300 mb-1">
              Ruth & Arnold
            </h1>
            <p className="text-lg text-yellow-100/70 font-light tracking-widest">
              CAGNOTTE EN DIRECT
            </p>
          </div>

          <motion.div
            className="relative mb-10"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl blur-xl opacity-30" />
            <div className="relative bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl border-2 border-yellow-400/50 rounded-3xl px-12 py-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Gift className="w-8 h-8 text-yellow-400" />
                <span className="text-xl text-yellow-100/80 font-light">Total collecté</span>
                <Gift className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 text-center" data-testid="text-total-amount">
                {formatAmount(total)}
              </div>
            </div>
          </motion.div>

          {top5.length > 0 && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-lg text-yellow-300/80 font-light tracking-widest">
                  TOP 5 CONTRIBUTIONS
                </h2>
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="space-y-2">
                {top5.map((contribution, idx) => (
                  <motion.div
                    key={`top-${contribution.id}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-yellow-400/20 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100' :
                        'bg-white/10 text-yellow-100/60'
                      }`}>
                        {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                      </div>
                      <p className="text-base font-medium text-white" data-testid={`text-top-donor-${idx}`}>
                        {contribution.donorName}
                      </p>
                    </div>
                    <div className="text-xl font-bold text-yellow-400" data-testid={`text-top-amount-${idx}`}>
                      {formatAmount(contribution.amount)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {scrollingList.length > 0 && (
          <div className="w-80 border-l border-yellow-400/20 bg-black/20 backdrop-blur-sm flex flex-col">
            <div className="p-4 border-b border-yellow-400/20 text-center">
              <h2 className="text-sm text-yellow-300/80 font-light tracking-widest uppercase">
                Tous les donateurs
              </h2>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <motion.div
                  className="flex flex-col"
                  animate={{
                    y: [0, -50 * scrollingList.length],
                  }}
                  transition={{
                    duration: scrollingList.length * 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {[...scrollingList, ...scrollingList].map((contribution, idx) => (
                    <div
                      key={`scroll-${contribution.id}-${idx}`}
                      className="flex items-center gap-3 px-4 py-3 border-b border-yellow-400/10"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {contribution.donorName}
                        </p>
                        {contribution.message && (
                          <p className="text-xs text-yellow-100/50 truncate">
                            "{contribution.message}"
                          </p>
                        )}
                      </div>
                      <div className="text-lg font-bold text-yellow-400 flex-shrink-0">
                        {formatAmount(contribution.amount)}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
              
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#16213e] to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#16213e] to-transparent pointer-events-none z-10" />
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

      <div className="absolute bottom-2 left-4 text-yellow-100/30 text-xs">
        Rafraîchissement automatique toutes les 5 secondes
      </div>
    </div>
  );
}

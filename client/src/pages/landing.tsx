import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Heart,
  ChevronDown,
  X,
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Link2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  insertRsvpResponseSchema,
  type InsertRsvpResponse,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AccommodationSection } from "@/components/accommodation";
import { motion, useScroll, useTransform } from "framer-motion";
import heroImage from "@assets/IMG_6360_1760648841327.jpg";
import couplePhoto from "@assets/DSC_8913_1766077508558.jpg";
import gallery3 from "@assets/IMG_6359_1760648863845.jpg";
import gallery4 from "@assets/IMG_6362_1760648863845.jpg";
import gallery5 from "@assets/DSC_8912_1766079012345.jpg";
import logoRA from "@assets/logo-ra.png";
import marryMePhoto from "@assets/IMG_6346_1760648863844.jpg";

const galleryImages = [
  {
    id: "couple-moment-1",
    src: "/gallery/IMG_8152.JPG",
    alt: "Moment complice ensemble",
  },
  {
    id: "couple-moment-2",
    src: "/gallery/IMG_8381.JPG",
    alt: "Notre belle complicité",
  },
  { id: "selfie-outdoor", src: gallery5, alt: "Selfie en amoureux" },
  {
    id: "engagement-bouquet",
    src: gallery3,
    alt: "Nos fiançailles avec le bouquet",
  },
  { id: "marry-me", src: marryMePhoto, alt: "La grande demande - Marry Me" },
  { id: "kiss-bouquet", src: gallery4, alt: "Notre baiser avec les roses" },
];

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const weddingDate = new Date("2026-03-19T00:00:00");

    const timer = setInterval(() => {
      const now = new Date();
      const difference = weddingDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-4 md:gap-8 justify-center items-center flex-wrap">
      {[
        { value: timeLeft.days, label: "Jours", testId: "countdown-days" },
        { value: timeLeft.hours, label: "Heures", testId: "countdown-hours" },
        {
          value: timeLeft.minutes,
          label: "Minutes",
          testId: "countdown-minutes",
        },
        {
          value: timeLeft.seconds,
          label: "Secondes",
          testId: "countdown-seconds",
        },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span
              className="text-2xl md:text-3xl font-serif font-bold text-primary"
              data-testid={item.testId}
            >
              {item.value.toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs md:text-sm text-muted-foreground mt-2 font-sans">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Lightbox({
  src,
  alt,
  photoId,
  onClose,
}: {
  src: string;
  alt: string;
  photoId?: string;
  onClose: () => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);

  // Create a photo-specific shareable link
  const shareUrl = photoId
    ? `${window.location.origin}?photo=${photoId}#galerie`
    : `${window.location.origin}#galerie`;
  const fullShareText = `Découvrez "${alt}" du mariage de Ruth & Arnold`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${fullShareText} - ${shareUrl}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(fullShareText)}`,
      "_blank",
      "width=600,height=400",
    );
  };

  const handleTwitterShare = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(fullShareText)}`,
      "_blank",
      "width=600,height=400",
    );
  };

  const handleWhatsAppShare = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(fullShareText + " " + shareUrl)}`,
      "_blank",
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={onClose}
          data-testid="button-close-lightbox"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-5xl w-full">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />

        <div
          className="flex flex-wrap gap-2 justify-center items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white text-sm font-sans mr-2 hidden sm:inline">
            Partager :
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full gap-2"
            onClick={handleFacebookShare}
            data-testid="button-share-facebook"
          >
            <Facebook className="h-4 w-4" />
            <span className="hidden sm:inline">Facebook</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full gap-2"
            onClick={handleTwitterShare}
            data-testid="button-share-twitter"
          >
            <Twitter className="h-4 w-4" />
            <span className="hidden sm:inline">Twitter</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full gap-2"
            onClick={handleWhatsAppShare}
            data-testid="button-share-whatsapp"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full gap-2"
            onClick={handleCopyLink}
            data-testid="button-copy-link"
          >
            {linkCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {linkCopied ? "Copié !" : "Copier lien"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { toast } = useToast();
  const [lightboxImage, setLightboxImage] = useState<{
    id?: string;
    src: string;
    alt: string;
  } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<InsertRsvpResponse>({
    resolver: zodResolver(insertRsvpResponseSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      partySize: 1,
      availability: undefined,
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async (data: InsertRsvpResponse) => {
      return await apiRequest("POST", "/api/rsvp", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/rsvp"] });

      setTimeout(() => {
        const element = document.getElementById("rsvp-success");
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description:
          error.message || "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertRsvpResponse) => {
    rsvpMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
        <motion.div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
          initial={{ scale: 1 }}
          animate={{ scale: 1.1 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/10 to-background/80" />

        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          {/* Logo prominent en haut */}
          <motion.div
            className="mb-4 animate-fade-in-up"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <img
              src={logoRA}
              alt="R&A Logo"
              className="h-16 md:h-20 lg:h-24 w-auto mx-auto drop-shadow-2xl"
              data-testid="logo-hero"
            />
          </motion.div>

          <p className="text-xs md:text-sm font-sans tracking-[0.3em] uppercase text-muted-foreground mb-3 animate-fade-in-up animation-delay-100">
            Celebrating Love
          </p>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light text-primary mb-6 leading-tight animate-fade-in-up animation-delay-200 drop-shadow-lg">
            RUTH <span className="text-foreground drop-shadow-lg">&</span>{" "}
            ARNOLD
          </h1>

          <div className="animate-fade-in-up animation-delay-300 mb-6">
            <p className="text-2xl md:text-4xl lg:text-5xl font-serif font-light text-foreground tracking-wide drop-shadow-lg">
              19 & 21 Mars 2026
            </p>
            <p className="text-base md:text-lg font-sans text-primary tracking-[0.3em] uppercase mt-2 drop-shadow-sm">
              Bruxelles
            </p>
          </div>

          <p className="text-xs md:text-sm font-sans text-foreground/90 mb-6 max-w-xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400 drop-shadow-sm">
            Rejoignez-nous pour célébrer notre union lors de deux journées
            inoubliables
          </p>

          <div className="animate-fade-in-up animation-delay-500">
            <Button
              variant="default"
              size="lg"
              className="rounded-full px-12 py-6 text-sm tracking-widest uppercase font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                document
                  .getElementById("rsvp")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-voir-plus"
            >
              Confirmer votre présence
            </Button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-muted-foreground/60" />
        </div>
      </section>

      {/* RSVP Section */}
      <section id="rsvp" className="py-24 md:py-32 lg:py-40 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          {!isSubmitted ? (
            <>
              <div className="mb-12">
                <Countdown />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-light text-center mb-12 text-foreground tracking-wide animate-in fade-in slide-in-from-top-4 duration-700">
                CONFIRMEZ VOTRE PRÉSENCE
              </h2>

              <p className="text-sm md:text-base text-center text-muted-foreground font-sans mb-16 italic animate-in fade-in duration-700 animation-delay-200">
                Merci de nous indiquer vos disponibilités afin de préparer nos
                invitations officielles
              </p>

              <Card className="p-8 md:p-16 bg-gradient-to-br from-background to-muted/10 border-2 border-primary/10 animate-in fade-in zoom-in duration-700 animation-delay-300">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-sans font-semibold text-foreground">
                              Prénom *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Votre prénom"
                                className="rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40 bg-background/50"
                                data-testid="input-firstname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-sans font-semibold text-foreground">
                              Nom *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Votre nom"
                                className="rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40 bg-background/50"
                                data-testid="input-lastname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-sans font-semibold text-foreground">
                            Adresse email *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="votre@email.com"
                              className="rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40 bg-background/50"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => {
                        const COUNTRY_CODES = [
                          { code: "+33", label: "🇫🇷 +33" },
                          { code: "+32", label: "🇧🇪 +32" },
                          { code: "+243", label: "🇨🇩 +243" },
                          { code: "+41", label: "🇨🇭 +41" },
                          { code: "+352", label: "🇱🇺 +352" },
                          { code: "+44", label: "🇬🇧 +44" },
                          { code: "+1", label: "🇺🇸 +1" },
                          { code: "+43", label: "🇦🇹 +43" },
                          { code: "+27", label: "🇿🇦 +27" },
                          { code: "+244", label: "🇦🇴 +244" },
                          { code: "+225", label: "🇨🇮 +225" },
                          { code: "+31", label: "🇳🇱 +31" },
                          { code: "+49", label: "🇩🇪 +49" },
                          { code: "+34", label: "🇪🇸 +34" },
                        ];

                        // Parse current value
                        const currentValue = field.value || "";
                        const match = COUNTRY_CODES.find((c) =>
                          currentValue.startsWith(c.code),
                        );
                        const countryCode = match ? match.code : "+33";
                        const localNumber = match
                          ? currentValue.slice(match.code.length)
                          : currentValue;

                        return (
                          <FormItem>
                            <FormLabel className="text-base font-sans font-semibold text-foreground">
                              Numéro WhatsApp (Optionnel)
                            </FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Select
                                  value={countryCode}
                                  onValueChange={(newCode) => {
                                    field.onChange(newCode + localNumber);
                                  }}
                                >
                                  <SelectTrigger className="w-[100px] bg-background/50 border-primary/20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COUNTRY_CODES.map((c) => (
                                      <SelectItem key={c.code} value={c.code}>
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="tel"
                                  value={localNumber}
                                  onChange={(e) => {
                                    const newNum = e.target.value;
                                    if (!newNum) field.onChange("");
                                    else field.onChange(countryCode + newNum);
                                  }}
                                  placeholder="6 12 34 56 78"
                                  className="flex-1 rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40 bg-background/50"
                                  data-testid="input-phone"
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Facultatif : pour recevoir votre invitation
                              directement sur WhatsApp.
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="partySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-sans font-semibold text-foreground">
                            Nombre de personnes *
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(parseInt(value))
                              }
                              value={field.value?.toString()}
                            >
                              <SelectTrigger
                                className="rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40"
                                data-testid="select-partysize"
                              >
                                <SelectValue placeholder="Sélectionnez" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1" data-testid="option-solo">
                                  Solo (1 personne)
                                </SelectItem>
                                <SelectItem
                                  value="2"
                                  data-testid="option-couple"
                                >
                                  Couple (2 personnes)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="availability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-sans font-semibold text-foreground">
                            Disponibilité *
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="rounded-lg border-2 border-primary/20 focus:border-primary transition-all hover:border-primary/40"
                                data-testid="select-availability"
                              >
                                <SelectValue placeholder="Sélectionnez votre disponibilité" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value="19-march"
                                data-testid="option-19-march"
                              >
                                19 mars seulement
                              </SelectItem>
                              <SelectItem
                                value="21-march"
                                data-testid="option-21-march"
                              >
                                21 mars seulement
                              </SelectItem>
                              <SelectItem
                                value="both"
                                data-testid="option-both"
                              >
                                Les deux dates
                              </SelectItem>
                              <SelectItem
                                value="unavailable"
                                data-testid="option-unavailable"
                              >
                                Je ne serai pas disponible
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      disabled={rsvpMutation.isPending}
                      data-testid="button-submit-rsvp"
                    >
                      {rsvpMutation.isPending
                        ? "Envoi en cours..."
                        : "Je confirme ma présence"}
                    </Button>
                  </form>
                </Form>
              </Card>
            </>
          ) : (
            <div
              id="rsvp-success"
              className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-chart-2/10 mb-6">
                <svg
                  className="w-10 h-10 text-chart-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-card-foreground mb-4">
                Merci !
              </h3>
              <p className="text-base md:text-lg text-muted-foreground font-sans mb-8">
                Nous avons bien reçu votre réponse. À très bientôt pour célébrer
                ensemble !
              </p>
              <Button
                variant="outline"
                onClick={() => setIsSubmitted(false)}
                className="rounded-full"
                data-testid="button-new-rsvp"
              >
                Ajouter une autre réponse
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Story Section */}
      <section
        id="story"
        className="py-24 md:py-32 lg:py-40 px-6 bg-background"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Photo avec cadre doré */}
            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
              <div className="relative p-4 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-lg shadow-2xl">
                <div className="absolute inset-0 border-4 border-primary/30 rounded-lg" />
                <div className="relative aspect-[3/4] overflow-hidden rounded-md">
                  <img
                    src={couplePhoto}
                    alt="Ruth & Arnold"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    data-testid="img-couple"
                  />
                </div>
              </div>
            </div>

            {/* Texte à côté */}
            <div className="text-center lg:text-left px-4 lg:px-0 animate-in fade-in slide-in-from-right-8 duration-700 animation-delay-200">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light text-foreground mb-8 tracking-wide">
                NOTRE HISTOIRE
              </h2>

              <div className="h-px w-16 bg-primary mb-8 mx-auto lg:mx-0 animate-in scale-x-0 origin-left duration-1000 animation-delay-300" />

              <div className="space-y-4 text-sm md:text-base font-sans leading-relaxed text-muted-foreground animate-in fade-in duration-700 animation-delay-400">
                <p>
                  Tout a commencé à La Charité, en France, lors d'un anniversaire surprise organisé pour un ami. Ce jour-là, sans que nous en ayons conscience, Dieu tissait déjà les premiers fils de notre histoire. Deux âmes se sont rencontrées, guidées par Sa volonté et Son timing parfait.
                </p>
                <p>
                  D'abord, il y eut une amitié sincère, faite d'échanges simples, de rires et de respect. Puis, pas à pas, Dieu a fait grandir nos cœurs, transformant cette amitié en un amour véritable, profond et évident.
                </p>
                <p>
                  Aujourd'hui, nous reconnaissons que cette rencontre n'était pas le fruit du hasard, mais un rendez-vous divin. Reconnaissants pour Son amour et Sa fidélité, nous avançons main dans la main, confiants que Celui qui a commencé cette œuvre continuera de bénir notre union.
                </p>
              </div>

              <p className="text-sm md:text-base font-sans text-foreground tracking-widest animate-in fade-in duration-700 animation-delay-500 mt-8">
                — Ruth & Arnold
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Program Section */}
      <section
        id="program"
        className="py-24 md:py-32 lg:py-40 px-6 bg-gradient-to-b from-background to-muted/20"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-foreground mb-16 text-center tracking-wide animate-in fade-in slide-in-from-top-4 duration-700">
            PROGRAMME DE CÉLÉBRATION
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* March 19 */}
            <Card className="p-10 md:p-12 border-l-4 border-l-primary hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-left-8 duration-700">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-serif font-bold text-primary">
                    19
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                    JEUDI 19 MARS
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    Dot & Cérémonie
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4 pb-4 border-b border-border/50">
                  <div className="w-1 bg-primary rounded-full mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-sans font-semibold text-foreground">
                      Dot
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bruxelles
                      <br />
                      19h30
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* March 21 */}
            <Card className="p-10 md:p-12 border-l-4 border-l-chart-2 hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-right-8 duration-700 animation-delay-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <span className="text-2xl font-serif font-bold text-chart-2">
                    21
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                    SAMEDI 21 MARS
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    Mariage & Réception
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4 pb-4 border-b border-border/50">
                  <div className="w-1 bg-chart-2 rounded-full mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-sans font-semibold text-foreground">
                      Mariage Civil
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Rhode-Saint-Genèse
                      <br />
                      10h00
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 pb-4 border-b border-border/50">
                  <div className="w-1 bg-chart-2 rounded-full mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-sans font-semibold text-foreground">
                      Bénédiction
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bruxelles
                      <br />
                      13h00
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-chart-2 rounded-full mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-sans font-semibold text-foreground">
                      Soirée & Réception
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bruxelles
                      <br />
                      20h00
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section
        id="galerie"
        className="py-24 md:py-32 lg:py-40 px-6 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-light text-center mb-16 text-foreground tracking-wide animate-in fade-in slide-in-from-top-4 duration-700">
            NOS MOMENTS PRÉCIEUX
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {galleryImages.map((image, idx) => (
              <div
                key={idx}
                className="relative aspect-[3/4] overflow-hidden cursor-pointer group animate-in fade-in zoom-in duration-700"
                onClick={() => setLightboxImage(image)}
                data-testid={`gallery-image-${idx}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accommodation Section */}
      <AccommodationSection />

      {/* Footer */}
      <footer className="py-16 md:py-20 px-6 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-xs font-sans tracking-widest uppercase text-foreground mb-6">
                INFORMATIONS
              </h3>
              <div className="space-y-3">
                <a
                  href="mailto:contact@ar2k26.com"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans"
                  data-testid="link-contact-email"
                >
                  contact@ar2k26.com
                </a>
                <a
                  href="https://wa.me/33698827193"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans"
                  data-testid="link-contact-whatsapp"
                >
                  WhatsApp: +33 6 98 82 71 93
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-sans tracking-widest uppercase text-foreground mb-6">
                DATES
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-sans">
                  19 Mars 2026
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  21 Mars 2026
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-sans tracking-widest uppercase text-foreground mb-6">
                NAVIGATION
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() =>
                    document
                      .getElementById("story")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans text-left"
                  data-testid="button-footer-nav-story"
                >
                  Notre Histoire
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("program")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans text-left"
                  data-testid="button-footer-nav-program"
                >
                  Programme
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("galerie")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans text-left"
                  data-testid="button-footer-nav-gallery"
                >
                  Galerie
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-sans tracking-widest uppercase text-foreground mb-6">
                ADMIN
              </h3>
              <div className="space-y-3">
                <a
                  href="/login"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors font-sans"
                  data-testid="link-admin-login"
                >
                  Accès Administration
                </a>
                <p className="text-xs text-muted-foreground/60 font-sans italic mt-4">
                  Deux dates, un seul amour
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center">
            <p className="text-xs text-muted-foreground font-sans tracking-wide">
              © 2026 Ruth & Arnold. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxImage && (
        <Lightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          photoId={lightboxImage.id}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

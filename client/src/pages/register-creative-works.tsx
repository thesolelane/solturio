import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette, Music, BookOpen, Code, PenTool, FileText } from "lucide-react";

const CREATIVE_WORK_TYPES = [
  {
    id: "artwork",
    label: "Artwork / Logo / Design",
    description: "Illustrations, logos, graphic designs, digital art, photographs, icons",
    icon: Palette,
    accepts: "image/png,image/jpeg,image/svg+xml,image/gif,image/webp",
  },
  {
    id: "audio",
    label: "Audio / Music",
    description: "Songs, sound effects, podcasts, voice recordings, beats, compositions",
    icon: Music,
    accepts: "audio/mpeg,audio/wav,audio/ogg,audio/flac",
  },
  {
    id: "book",
    label: "Books / Written Works",
    description: "Manuscripts, novels, articles, research papers, poetry, scripts",
    icon: BookOpen,
    accepts: "application/pdf,text/plain,application/epub+zip",
  },
  {
    id: "code",
    label: "Source Code / Software",
    description: "Algorithms, smart contracts, applications, scripts, libraries",
    icon: Code,
    accepts: "text/plain,application/zip,application/gzip",
  },
  {
    id: "drawing",
    label: "Drawings / Blueprints",
    description: "Technical drawings, CAD files, architectural plans, schematics",
    icon: PenTool,
    accepts: "image/png,image/jpeg,image/svg+xml,application/pdf",
  },
  {
    id: "plan",
    label: "Plans / Documents",
    description: "Business plans, whitepapers, technical specifications, pitch decks",
    icon: FileText,
    accepts: "application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

export default function RegisterCreativeWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/register")}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Template Selection
      </Button>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">
          What Type of Creative Work?
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the type of creative work you want to register. Each type has a tailored registration flow.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {CREATIVE_WORK_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => setLocation(`/register/artwork?type=${type.id}`)}
              data-testid={`card-creative-type-${type.id}`}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{type.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
                <Button variant="outline" size="sm" className="w-full mt-4" data-testid={`button-select-${type.id}`}>
                  Register {type.label.split(" / ")[0]}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Card className="max-w-3xl mx-auto bg-muted/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">All Types Get the Same Protection</h3>
            <p className="text-sm text-muted-foreground">
              Regardless of the type you choose, your work gets timestamped proof of ownership, SHA-256 file hashing, and eligibility for on-chain NFT certification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

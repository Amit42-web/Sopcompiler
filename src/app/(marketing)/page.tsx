import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ScanText,
  Braces,
  ShieldCheck,
  Workflow,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: ScanText,
    title: "AI Extraction",
    description:
      "Parse SOP documents and detect sections, scenarios, and resolutions automatically.",
  },
  {
    icon: Braces,
    title: "Rule Engine JSON",
    description:
      "Generate clean, executable rule definitions ready for your engine of choice.",
  },
  {
    icon: Layers,
    title: "Knowledge Base",
    description:
      "Build a living glossary of terms and metadata across every procedure.",
  },
  {
    icon: ShieldCheck,
    title: "Validation & Export",
    description:
      "Catch conflicts and gaps, then export production-ready rule sets.",
  },
];

const steps = [
  { icon: FileText, title: "Upload SOPs", text: "PDF, DOCX, or TXT." },
  { icon: ScanText, title: "AI analyzes", text: "Sections & scenarios." },
  { icon: Braces, title: "Export rules", text: "Executable JSON." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Badge variant="secondary" className="gap-1.5">
          <Workflow className="h-3.5 w-3.5" />
          SOP → Rule Engine, automated
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Turn your SOPs into{" "}
          <span className="text-primary">executable rules</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          RuleForge AI converts Standard Operating Procedure documents into
          clean, validated Rule Engine JSON — so your policies run as code.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/upload">
              Upload your first SOP
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need to operationalize policy
          </h2>
          <p className="mt-3 text-muted-foreground">
            A complete pipeline from raw documents to production rule sets.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to forge your first rule set?
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Upload a document and watch RuleForge AI extract the logic in
              seconds.
            </p>
            <Button asChild size="lg">
              <Link href="/upload">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

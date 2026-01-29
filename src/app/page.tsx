import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  CheckCircle,
  ArrowRight,
  Boxes,
  FileCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/layout/Container';
import { HomeStats } from '@/components/home/HomeStats';

const features = [
  {
    icon: Lock,
    title: 'Immutable Records',
    description:
      'Project commitments are stored on DataHaven decentralized storage, making them tamper-proof and permanently accessible.',
  },
  {
    icon: Eye,
    title: 'Full Transparency',
    description:
      'Track what projects promised vs what they delivered. Hold teams accountable with verifiable on-chain evidence.',
  },
  {
    icon: CheckCircle,
    title: 'Cryptographic Verification',
    description:
      'Every commitment is secured with Merkle proofs. Verify data integrity without trusting any single party.',
  },
  {
    icon: Clock,
    title: 'Historical Timeline',
    description:
      'See the complete history of project announcements, roadmaps, and updates with precise timestamps.',
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl" />
                <Shield className="relative h-20 w-20 text-emerald-400" />
              </div>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Crypto Projects&apos; Promises
              </span>
              <br />
              <span className="text-foreground">Permanently Recorded</span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
              VaultWatch leverages DataHaven decentralized storage to create
              tamper-proof records of project commitments. Track roadmaps,
              tokenomics, and promises with cryptographic verification.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/projects">
                  <Boxes className="mr-2 h-5 w-5" />
                  Browse Projects
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">
                  <FileCheck className="mr-2 h-5 w-5" />
                  Register Your Project
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats Section */}
      <HomeStats />

      {/* Features Section */}
      <section className="py-20 sm:py-32">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why VaultWatch?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              In crypto, promises are often broken and forgotten. VaultWatch
              ensures that commitments are recorded permanently and verifiably.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-border/40 bg-card/50 backdrop-blur transition-colors hover:border-emerald-500/50"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                    <feature.icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-border/40 bg-muted/30 py-20 sm:py-32">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Simple, transparent, and cryptographically secure.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Register Project',
                description:
                  'Connect your wallet and register your project with basic information.',
              },
              {
                step: '02',
                title: 'Record Commitments',
                description:
                  'Add roadmap items, tokenomics, partnerships, and other promises with evidence.',
              },
              {
                step: '03',
                title: 'Build Trust',
                description:
                  'Investors can verify your track record and make informed decisions.',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl font-bold text-emerald-400">
                  {item.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <Container size="small">
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10">
            <CardContent className="p-8 text-center sm:p-12">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                Ready to Build Trust?
              </h2>
              <p className="mb-8 text-muted-foreground">
                Join the growing ecosystem of transparent crypto projects.
                Register today and start building verifiable credibility.
              </p>
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </Container>
      </section>

      {/* Powered By Section */}
      <section className="border-t border-border/40 py-12">
        <Container>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Powered by{' '}
              <a
                href="https://datahaven.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-400 hover:underline"
              >
                DataHaven
              </a>{' '}
              Decentralized Storage
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}

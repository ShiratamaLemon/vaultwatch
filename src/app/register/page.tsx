'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, AlertCircle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectForm } from '@/components/project/ProjectForm';

export default function RegisterPage() {
  const { isConnected } = useAccount();

  return (
    <div className="py-12">
      <Container size="small">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <Shield className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Register Your Project</h1>
          <p className="mt-2 text-muted-foreground">
            Create a permanent, verifiable record of your project&apos;s commitments.
          </p>
        </div>

        {!isConnected ? (
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">Wallet Connection Required</h2>
              <p className="mb-6 text-center text-muted-foreground">
                Please connect your wallet to register a project on VaultWatch.
              </p>
              <ConnectButton />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Info Banner */}
            <Card className="mb-8 border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="flex items-start gap-4 py-4">
                <AlertCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-400">
                    Your data will be stored on DataHaven
                  </p>
                  <p className="text-muted-foreground">
                    All project information will be permanently recorded on DataHaven
                    decentralized storage with cryptographic verification.
                  </p>
                </div>
              </CardContent>
            </Card>

            <ProjectForm />
          </>
        )}
      </Container>
    </div>
  );
}

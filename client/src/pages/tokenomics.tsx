import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Coins, 
  Lock,
  ExternalLink,
  RefreshCw,
  Zap,
  Users,
  Target,
  BarChart3
} from "lucide-react";

type OnChainConfig = {
  verified: boolean;
  mintAddress: string;
  totalSupply: string;
  decimals: number;
  authority: string;
  freezeAuthority: string | null;
  vestingSchedule: {
    cliff: number;
    duration: number;
    interval: number;
  };
  rewardPoolCap: string;
  lastUpdated: string;
};

export default function TokenomicsPage() {
  const { data: onChainConfig, isLoading: configLoading, refetch } = useQuery<OnChainConfig>({
    queryKey: ['/api/tokenomics/on-chain-config'],
  });

  const TOKENOMICS = {
    token: {
      name: '$SLTR',
      type: 'SPL Utility Token',
      totalSupply: '1,000,000,000',
      decimals: 9,
    },
    distribution: [
      { category: 'Community Rewards Pool', percentage: 50, description: 'Platform engagement, quizzes, referrals' },
      { category: 'Development & Operations', percentage: 20, description: 'Team vesting, infrastructure, development' },
      { category: 'Ecosystem Growth', percentage: 15, description: 'Partnerships, integrations, marketing' },
      { category: 'Reserve Fund', percentage: 10, description: 'Emergency reserves, future initiatives' },
      { category: 'Initial Liquidity', percentage: 5, description: 'DEX liquidity provision' },
    ],
    vesting: {
      team: '24 months with 6-month cliff',
      advisors: '18 months with 3-month cliff',
      community: 'Distributed based on activity, no cliff',
    },
  };

  const RISKS = [
    {
      risk: 'Smart Contract Vulnerability',
      likelihood: 'Low',
      impact: 'High',
      mitigation: 'Multiple audits, bug bounty program, gradual rollout with caps',
    },
    {
      risk: 'Token Price Volatility',
      likelihood: 'High',
      impact: 'Medium',
      mitigation: '$SLTR is utility-only, rewards capped, no trading promises',
    },
    {
      risk: 'Regulatory Changes',
      likelihood: 'Medium',
      impact: 'High',
      mitigation: 'Utility token classification, no investment promises, legal review',
    },
    {
      risk: 'Low User Adoption',
      likelihood: 'Medium',
      impact: 'Medium',
      mitigation: 'Focused marketing, partnership development, continuous UX improvement',
    },
    {
      risk: 'Crank Bot Downtime',
      likelihood: 'Low',
      impact: 'Low',
      mitigation: 'Redundant infrastructure, monitoring alerts, manual fallback procedures',
    },
  ];

  const METRICS = [
    { name: 'Total Users Registered', value: '---', target: '10,000', icon: Users },
    { name: 'Logos Protected', value: '---', target: '50,000', icon: Shield },
    { name: 'License Contracts Deployed', value: '---', target: '5,000', icon: Target },
    { name: '$SLTR Distributed', value: '---', target: '50M', icon: Coins },
  ];

  const OPERATIONS = {
    crankBot: {
      description: 'Automated service that processes pending reward distributions and updates on-chain state',
      frequency: 'Every 5 minutes',
      functions: [
        'Process pending $SLTR reward claims',
        'Update leaderboard snapshots',
        'Verify subscription status',
        'Clean up expired sessions',
      ],
      monitoring: 'Real-time alerts via Telegram, automatic restart on failure',
      fallback: 'Manual processing available via admin dashboard',
    },
    rewardFlow: [
      'User completes qualifying action (quiz, registration, referral)',
      'Backend validates action and calculates reward amount',
      'Reward entry created in database with pending status',
      'Crank bot picks up pending rewards in next cycle',
      'On-chain transaction executed from reward pool',
      'Database updated with transaction signature',
      'User notified of successful reward',
    ],
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return '';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return '';
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">$SLTR Tokenomics</h1>
        <p className="text-muted-foreground">
          Complete transparency on token distribution, risks, operations, and on-chain verification
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-tokenomics">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="risks" data-testid="tab-risks">Risks</TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
          <TabsTrigger value="verified" data-testid="tab-verified">On-Chain</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Token Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Name</span>
                  <span className="font-medium">{TOKENOMICS.token.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary">{TOKENOMICS.token.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-medium">{TOKENOMICS.token.totalSupply}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Decimals</span>
                  <span className="font-medium">{TOKENOMICS.token.decimals}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Vesting Schedule
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Team Tokens</span>
                  <p className="font-medium">{TOKENOMICS.vesting.team}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Advisor Tokens</span>
                  <p className="font-medium">{TOKENOMICS.vesting.advisors}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Community Rewards</span>
                  <p className="font-medium">{TOKENOMICS.vesting.community}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Token Distribution
            </h2>
            <div className="space-y-4">
              {TOKENOMICS.distribution.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-primary font-bold">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Success Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {METRICS.map((metric, index) => (
                <div key={index} className="text-center p-4 bg-muted/50 rounded-lg">
                  <metric.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="text-xs text-muted-foreground mb-1">{metric.name}</div>
                  <div className="text-xs text-primary">Target: {metric.target}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Assessment & Mitigation
            </h2>
            <p className="text-muted-foreground mb-6">
              We believe in full transparency. Here are the identified risks and our mitigation strategies.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Risk</th>
                    <th className="text-left py-3 px-2">Likelihood</th>
                    <th className="text-left py-3 px-2">Impact</th>
                    <th className="text-left py-3 px-2">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {RISKS.map((risk, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{risk.risk}</td>
                      <td className="py-3 px-2">
                        <Badge className={getLikelihoodColor(risk.likelihood)}>{risk.likelihood}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={getImpactColor(risk.impact)}>{risk.impact}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{risk.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6 border-yellow-500/50">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Important Disclaimers
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>$SLTR is a utility token only. It does not represent investment, equity, or ownership.</li>
              <li>Token value may fluctuate. Do not purchase expecting financial returns.</li>
              <li>All platform fees are non-refundable service fees.</li>
              <li>Past performance does not guarantee future results.</li>
              <li>Cryptocurrency involves risk. Only participate with funds you can afford to lose.</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Crank Bot Operations
            </h2>
            <p className="text-muted-foreground mb-4">{OPERATIONS.crankBot.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Execution Frequency
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{OPERATIONS.crankBot.frequency}</p>
                
                <h3 className="font-medium mb-2">Functions</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {OPERATIONS.crankBot.functions.map((func, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {func}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Monitoring</h3>
                <p className="text-sm text-muted-foreground mb-4">{OPERATIONS.crankBot.monitoring}</p>
                
                <h3 className="font-medium mb-2">Fallback Procedure</h3>
                <p className="text-sm text-muted-foreground">{OPERATIONS.crankBot.fallback}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reward Distribution Flow
            </h2>
            <div className="space-y-4">
              {OPERATIONS.rewardFlow.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="verified" className="space-y-6">
          <Card className="p-6 border-2 border-green-500/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Verified On-Chain Configuration
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={configLoading}
                data-testid="button-refresh-config"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${configLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <p className="text-muted-foreground mb-6">
              These values are read directly from the Solana blockchain. Click the links to verify on Solscan.
            </p>

            {configLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading on-chain data...</p>
              </div>
            ) : onChainConfig ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {onChainConfig.verified ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Not Verified</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Last updated: {onChainConfig.lastUpdated}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Mint Address</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono truncate">{onChainConfig.mintAddress}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <a 
                          href={`https://solscan.io/token/${onChainConfig.mintAddress}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          data-testid="link-mint-solscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Total Supply</span>
                    <p className="font-mono font-bold mt-1">{onChainConfig.totalSupply}</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Decimals</span>
                    <p className="font-mono font-bold mt-1">{onChainConfig.decimals}</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Reward Pool Cap</span>
                    <p className="font-mono font-bold mt-1">{onChainConfig.rewardPoolCap}</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Mint Authority</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono truncate">{onChainConfig.authority}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <a 
                          href={`https://solscan.io/account/${onChainConfig.authority}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Freeze Authority</span>
                    <p className="font-mono text-sm mt-1">
                      {onChainConfig.freezeAuthority || 'None (Renounced)'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg mt-4">
                  <span className="text-xs text-muted-foreground">Vesting Configuration</span>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Cliff</span>
                      <p className="font-medium">{onChainConfig.vestingSchedule.cliff} days</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Duration</span>
                      <p className="font-medium">{onChainConfig.vestingSchedule.duration} days</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Interval</span>
                      <p className="font-medium">{onChainConfig.vestingSchedule.interval} days</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>On-chain configuration not yet available.</p>
                <p className="text-sm">Token will be deployed at mainnet launch.</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">How to Independently Verify</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Copy the Mint Address shown above</li>
              <li>Visit Solscan.io and paste the address in the search bar</li>
              <li>Compare the Total Supply, Decimals, and Authority with our displayed values</li>
              <li>Check the token's transaction history for transparency</li>
            </ol>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

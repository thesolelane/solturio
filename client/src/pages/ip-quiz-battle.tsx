import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Swords,
  Trophy,
  Coins,
  Users,
  Timer,
  Target,
  Zap,
  Star,
  TrendingUp,
  AlertCircle,
  UserPlus,
  Globe,
  Shield,
  Crown,
  Sparkles,
  Award,
  Gamepad2,
  Flame
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BattleRoom {
  id: string;
  name: string;
  type: "1v1" | "community" | "tournament";
  wagerAmount: string;
  participants: {
    id: string;
    username: string;
    avatar?: string;
    score: number;
    community?: string;
  }[];
  maxParticipants: number;
  status: "waiting" | "active" | "completed";
  winner?: string;
  totalPrizePool: string;
  createdAt: string;
  startsAt?: string;
}

export default function IPQuizBattle() {
  const { toast } = useToast();
  const [selectedBattleType, setSelectedBattleType] = useState<"1v1" | "community" | "tournament">("1v1");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [wagerAmount, setWagerAmount] = useState("10");
  const [roomName, setRoomName] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");

  // Mock data for active battles
  const activeBattles: BattleRoom[] = [
    {
      id: "1",
      name: "Quick Duel #423",
      type: "1v1",
      wagerAmount: "50",
      participants: [
        { id: "1", username: "CryptoKing", score: 0 }
      ],
      maxParticipants: 2,
      status: "waiting",
      totalPrizePool: "100",
      createdAt: new Date().toISOString()
    },
    {
      id: "2",
      name: "BONK vs SOLT Community War",
      type: "community",
      wagerAmount: "100",
      participants: [
        { id: "1", username: "BONKArmy", score: 1200, community: "BONK" },
        { id: "2", username: "SOLTCrew", score: 800, community: "SOLT" }
      ],
      maxParticipants: 100,
      status: "active",
      totalPrizePool: "5000",
      createdAt: new Date().toISOString()
    },
    {
      id: "3",
      name: "IP Masters Tournament",
      type: "tournament",
      wagerAmount: "500",
      participants: Array.from({ length: 8 }, (_, i) => ({
        id: `${i}`,
        username: `Player${i + 1}`,
        score: Math.floor(Math.random() * 1000)
      })),
      maxParticipants: 16,
      status: "active",
      totalPrizePool: "8000",
      createdAt: new Date().toISOString()
    }
  ];

  // Mock user balance
  const userBalance = "2500";

  const createBattleRoom = () => {
    if (!roomName || !wagerAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter room name and wager amount",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Battle Room Created! ⚔️",
      description: `${roomName} created with ${wagerAmount} $SOLT wager`
    });
    setCreateRoomOpen(false);
    setRoomName("");
    setWagerAmount("10");
  };

  const joinBattle = (battle: BattleRoom) => {
    toast({
      title: "Joined Battle! 🎮",
      description: `You've entered ${battle.name} with ${battle.wagerAmount} $SOLT wager`
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-orange-500">
              <Swords className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">IP Quiz Battles</h1>
              <p className="text-muted-foreground">
                Bet $SOLT tokens • Challenge players • Winner takes all
              </p>
            </div>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Coins className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold">{userBalance} $SOLT</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Battles</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Prize Pool</p>
                  <p className="text-2xl font-bold">45.2K</p>
                </div>
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Win Rate</p>
                  <p className="text-2xl font-bold">67%</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ranking</p>
                  <p className="text-2xl font-bold">#42</p>
                </div>
                <Crown className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Battle Types */}
      <Tabs value={selectedBattleType} onValueChange={(v) => setSelectedBattleType(v as any)}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="1v1">
              <UserPlus className="h-4 w-4 mr-2" />
              1v1 Duels
            </TabsTrigger>
            <TabsTrigger value="community">
              <Users className="h-4 w-4 mr-2" />
              Community Wars
            </TabsTrigger>
            <TabsTrigger value="tournament">
              <Trophy className="h-4 w-4 mr-2" />
              Tournaments
            </TabsTrigger>
          </TabsList>

          <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
                <Swords className="h-4 w-4 mr-2" />
                Create Battle Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Battle Room</DialogTitle>
                <DialogDescription>
                  Set up a winner-takes-all IP Quiz battle
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Room Name</Label>
                  <Input
                    placeholder="Epic IP Battle"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    data-testid="input-room-name"
                  />
                </div>
                <div>
                  <Label>Battle Type</Label>
                  <Select value={selectedBattleType} onValueChange={(v) => setSelectedBattleType(v as any)}>
                    <SelectTrigger data-testid="select-battle-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1v1">1v1 Duel</SelectItem>
                      <SelectItem value="community">Community War</SelectItem>
                      <SelectItem value="tournament">Tournament (8-16 players)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Wager Amount ($SOLT per player)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(e.target.value)}
                    data-testid="input-wager-amount"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum: 10 $SOLT • Maximum: 1000 $SOLT
                  </p>
                </div>
                {selectedBattleType === "community" && (
                  <div>
                    <Label>Your Community</Label>
                    <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                      <SelectTrigger data-testid="select-community">
                        <SelectValue placeholder="Select community" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bonk">BONK Army</SelectItem>
                        <SelectItem value="solt">SOLT Crew</SelectItem>
                        <SelectItem value="sol">SOL Squad</SelectItem>
                        <SelectItem value="custom">Custom Token</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={createBattleRoom} className="w-full" data-testid="button-create-room">
                  <Zap className="h-4 w-4 mr-2" />
                  Create Battle (Cost: {wagerAmount} $SOLT)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Battle Rooms */}
        <TabsContent value="1v1" className="space-y-4">
          {activeBattles.filter(b => b.type === "1v1").map(battle => (
            <Card key={battle.id} className={battle.status === "active" ? "border-orange-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{battle.name}</CardTitle>
                    <CardDescription>
                      Wager: {battle.wagerAmount} $SOLT • Prize: {battle.totalPrizePool} $SOLT
                    </CardDescription>
                  </div>
                  <Badge variant={battle.status === "waiting" ? "secondary" : "default"}>
                    {battle.status === "waiting" ? "Waiting for opponent" : "Battle in progress"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {battle.participants.map((p, i) => (
                        <div
                          key={p.id}
                          className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-background"
                        >
                          {p.username[0]}
                        </div>
                      ))}
                      {battle.participants.length < battle.maxParticipants && (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {battle.participants.map(p => p.username).join(" vs ")}
                        {battle.participants.length < battle.maxParticipants && " vs ???"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {battle.participants.length}/{battle.maxParticipants} players
                      </p>
                    </div>
                  </div>
                  {battle.status === "waiting" && (
                    <Button onClick={() => joinBattle(battle)} data-testid={`button-join-battle-${battle.id}`}>
                      <Swords className="h-4 w-4 mr-2" />
                      Join Battle
                    </Button>
                  )}
                  {battle.status === "active" && (
                    <Button variant="outline" data-testid={`button-spectate-${battle.id}`}>
                      <Target className="h-4 w-4 mr-2" />
                      Spectate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          {activeBattles.filter(b => b.type === "community").map(battle => (
            <Card key={battle.id} className="border-purple-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      {battle.name}
                    </CardTitle>
                    <CardDescription>
                      Community War • Entry: {battle.wagerAmount} $SOLT • Total Pool: {battle.totalPrizePool} $SOLT
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    LIVE BATTLE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score display for communities */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold">BONK Army</p>
                        <Badge>45 players</Badge>
                      </div>
                      <p className="text-3xl font-bold">12,450</p>
                      <Progress value={60} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold">SOLT Crew</p>
                        <Badge>38 players</Badge>
                      </div>
                      <p className="text-3xl font-bold">9,200</p>
                      <Progress value={40} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" data-testid={`button-join-community-${battle.id}`}>
                    <Users className="h-4 w-4 mr-2" />
                    Join Your Community
                  </Button>
                  <Button variant="outline" data-testid={`button-spectate-community-${battle.id}`}>
                    <Target className="h-4 w-4 mr-2" />
                    Watch Live
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tournament" className="space-y-4">
          {activeBattles.filter(b => b.type === "tournament").map(battle => (
            <Card key={battle.id} className="border-yellow-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      {battle.name}
                    </CardTitle>
                    <CardDescription>
                      Entry: {battle.wagerAmount} $SOLT • Prize Pool: {battle.totalPrizePool} $SOLT
                    </CardDescription>
                  </div>
                  <Badge variant={battle.status === "waiting" ? "secondary" : "default"}>
                    {battle.participants.length}/{battle.maxParticipants} Players
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Tournament bracket preview */}
                  <div className="grid grid-cols-4 gap-2">
                    {battle.participants.slice(0, 8).map((p, i) => (
                      <div key={p.id} className="p-2 rounded bg-muted text-sm">
                        <p className="font-medium truncate">{p.username}</p>
                        <p className="text-xs text-muted-foreground">{p.score} pts</p>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - battle.participants.length) }, (_, i) => (
                      <div key={`empty-${i}`} className="p-2 rounded border-2 border-dashed border-muted text-sm">
                        <p className="text-muted-foreground">Open Slot</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={battle.status === "active"} data-testid={`button-join-tournament-${battle.id}`}>
                      <Trophy className="h-4 w-4 mr-2" />
                      Enter Tournament
                    </Button>
                    <Button variant="outline" data-testid={`button-view-bracket-${battle.id}`}>
                      View Bracket
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Battle Format Info */}
      <Alert className="mt-6 border-primary">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Battle Format</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">15 Questions</Badge>
              <span>per round from USPTO, WIPO, EUIPO & EPO sources</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Progressive Difficulty</Badge>
              <span>Each round gets harder with more complex IP law questions</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Winner Takes All</Badge>
              <span>Highest score after 15 questions wins the entire prize pool</span>
            </div>
            <div className="mt-3 p-2 bg-muted rounded">
              <p className="text-sm font-medium">Difficulty Progression:</p>
              <div className="flex gap-4 mt-1 text-xs">
                <span>Round 1: Basic (Q1-5)</span>
                <span>→</span>
                <span>Round 2: Intermediate (Q6-10)</span>
                <span>→</span>
                <span>Round 3: Expert (Q11-15)</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Upcoming Features Alert */}
      <Alert className="mt-4">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Coming Soon:</strong> Team battles with multiple players per side, 
          custom community challenges, and weekly championship tournaments with massive prize pools!
        </AlertDescription>
      </Alert>
    </div>
  );
}
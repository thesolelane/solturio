import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Trophy,
  Coins,
  Timer,
  Target,
  Zap,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  Award
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QuizQuestion, QuizStats } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Quiz categories from international IP authorities
const CATEGORIES = [
  { name: "USPTO Trademarks", icon: "™️", source: "USPTO" },
  { name: "WIPO Basics", icon: "🌍", source: "WIPO" },
  { name: "EUIPO Rights", icon: "🇪🇺", source: "EUIPO" },
  { name: "EPO Patents", icon: "🛡️", source: "EPO" },
  { name: "Copyright Global", icon: "©️", source: "Multiple" },
  { name: "IP Enforcement", icon: "⚖️", source: "All" },
];

const POINT_VALUES = [100, 200, 300, 400, 500];

export default function IPQuiz() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [showCathReward, setShowCathReward] = useState(false);
  const [cathEarned, setCathEarned] = useState<string>("0");
  const [hintUsed, setHintUsed] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);

  // Fetch user stats
  const { data: stats } = useQuery<QuizStats>({
    queryKey: ["/api/quiz/stats"],
  });

  // Fetch available questions
  const { data: availableQuestions = [] } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz/questions"],
    enabled: !!selectedCategory && !!selectedPoints,
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer, hintUsed }: { questionId: string; answer: string; hintUsed: boolean }) => {
      return apiRequest("/api/quiz/answer", {
        method: "POST",
        body: { 
          questionId, 
          answer, 
          timeToAnswer: 30 - timeLeft,
          hintUsed,
          originalPoints: selectedPoints
        },
      });
    },
    onSuccess: (data: any) => {
      // Timer and answer are already shown immediately on submit
      
      if (data.isCorrect) {
        setSessionScore(sessionScore + data.pointsEarned);
        setSessionStreak(sessionStreak + 1);
        
        if (data.cathReward && parseFloat(data.cathReward) > 0) {
          setCathEarned(data.cathReward);
          setShowCathReward(true);
          setTimeout(() => setShowCathReward(false), 3000);
        }
        
        toast({
          title: "Correct! 🎉",
          description: `You earned ${data.pointsEarned} points${data.cathReward ? ` and ${data.cathReward} $CATH` : ""}!`,
        });
      } else {
        setSessionStreak(0);
        toast({
          title: "Incorrect",
          description: "Keep learning! Check the explanation below.",
          variant: "destructive",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/stats"] });
    },
  });

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isTimerActive) {
      handleTimeUp();
    }
  }, [isTimerActive, timeLeft]);

  // Handle time up
  const handleTimeUp = () => {
    setIsTimerActive(false);
    setShowAnswer(true);
    toast({
      title: "Time's Up! ⏰",
      description: "The correct answer is shown below.",
      variant: "destructive",
    });
  };

  // Mock multiple choice questions
  const getMockQuestion = (category: string, points: number) => {
    const mockQuestions = [
      {
        question: "What symbol indicates a registered trademark in the United States?",
        options: ["™", "®", "©", "℠"],
        answer: "®",
        explanation: "The ® symbol (R in a circle) indicates a federally registered trademark. It can only be used after USPTO registration is complete.",
      },
      {
        question: "How long does copyright protection typically last for individual creators?",
        options: ["20 years", "50 years", "Life + 70 years", "100 years"],
        answer: "Life + 70 years",
        explanation: "Under WIPO and most national laws, copyright lasts for the life of the creator plus 70 years after death.",
      },
      {
        question: "What is the maximum duration for EU design protection?",
        options: ["10 years", "15 years", "20 years", "25 years"],
        answer: "25 years",
        explanation: "EUIPO registered community designs can be protected for up to 25 years with renewals every 5 years.",
      }
    ];
    
    const selected = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
    return {
      id: `mock-${Date.now()}`,
      category,
      difficulty: points <= 200 ? "easy" : points <= 400 ? "medium" : "hard",
      points,
      ...selected,
      sourceUrl: category.includes("USPTO") ? "https://www.uspto.gov" : 
                 category.includes("WIPO") ? "https://www.wipo.int" :
                 category.includes("EUIPO") ? "https://euipo.europa.eu" : "https://www.epo.org",
      isActive: true,
      createdAt: new Date(),
    };
  };

  // Select a question
  const selectQuestion = (category: string, points: number) => {
    setSelectedCategory(category);
    setSelectedPoints(points);
    setHintUsed(false);
    setEliminatedOptions([]);
    
    // Get a random question for this category/points
    const questions = availableQuestions.filter(
      q => q.category === category && q.points === points
    );
    
    if (questions.length > 0) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
      setSelectedAnswer("");
      setShowAnswer(false);
      setTimeLeft(30);
      setIsTimerActive(true);
    } else {
      // Use mock question if none available
      const mockQuestion = getMockQuestion(category, points);
      setCurrentQuestion(mockQuestion as any);
      setSelectedAnswer("");
      setShowAnswer(false);
      setTimeLeft(30);
      setIsTimerActive(true);
    }
  };

  // Use hint (eliminates 2 wrong answers, reduces points by 75%)
  const useHint = () => {
    if (!currentQuestion || hintUsed || showAnswer) return;
    
    const options = (currentQuestion as any).options || ["A", "B", "C", "D"];
    const correctAnswer = currentQuestion.answer;
    const wrongOptions = options.filter((opt: string) => opt !== correctAnswer);
    
    // Randomly eliminate 2 wrong answers
    const toEliminate = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminatedOptions(toEliminate);
    setHintUsed(true);
    
    toast({
      title: "Hint Used! 💡",
      description: "2 wrong answers eliminated. Points reduced by 75%.",
    });
  };

  // Submit answer
  const handleSubmitAnswer = () => {
    if (!currentQuestion || !selectedAnswer) return;
    
    // Immediately stop timer and show answer
    setIsTimerActive(false);
    setShowAnswer(true);
    
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      hintUsed: hintUsed,
    });
  };

  // Get color for points
  const getPointColor = (points: number) => {
    if (points <= 200) return "text-green-600";
    if (points <= 400) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" />
                IP Knowledge Quiz
              </CardTitle>
              <CardDescription>
                Test your IP knowledge and earn $CATH rewards!
              </CardDescription>
            </div>
            
            {/* User Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats?.totalPoints || 0}</p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Coins className="w-5 h-5" />
                  {stats?.totalCathEarned || "0"}
                </p>
                <p className="text-xs text-muted-foreground">$CATH Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  {stats?.longestStreak || 0}
                </p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Session Score</p>
                <p className="text-2xl font-bold">{sessionScore}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{sessionStreak}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">
                  {stats?.totalQuestions 
                    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) 
                    : 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">{stats?.totalQuestions || 0}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* $CATH Reward Animation */}
      {showCathReward && (
        <Alert className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300">
          <Sparkles className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="font-bold text-yellow-900">
            +{cathEarned} $CATH earned! Keep your streak going for bigger rewards!
          </AlertDescription>
        </Alert>
      )}

      {/* Question Board or Active Question */}
      {!currentQuestion ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Question</CardTitle>
            <CardDescription>
              Select a category and point value. Higher points = harder questions = more $CATH!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2">Category</th>
                    {POINT_VALUES.map(points => (
                      <th key={points} className="text-center p-2">
                        <span className={`font-bold ${getPointColor(points)}`}>
                          {points}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(category => (
                    <tr key={category.name} className="border-t">
                      <td className="p-2 font-medium">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          {category.name}
                        </span>
                      </td>
                      {POINT_VALUES.map(points => (
                        <td key={points} className="p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-16 hover-elevate"
                            onClick={() => selectQuestion(category.name, points)}
                          >
                            {points}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Alert className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Scoring:</strong> Answer correctly to earn points. 
                Build streaks for bonus $CATH rewards! 
                All questions cite official USPTO and Copyright.gov sources.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentQuestion.category}
                  <Badge variant="secondary">{currentQuestion.points} points</Badge>
                </CardTitle>
              </div>
              
              {/* Timer */}
              {isTimerActive && (
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-muted-foreground" />
                  <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-red-600' : ''}`}>
                    0:{timeLeft.toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            
            {isTimerActive && (
              <Progress value={(timeLeft / 30) * 100} className="mt-2" />
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Question */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg font-medium">{currentQuestion.question}</p>
            </div>
            
            {/* Multiple Choice Options */}
            {!showAnswer && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {((currentQuestion as any).options || ["A", "B", "C", "D"]).map((option: string, index: number) => (
                    <Button
                      key={option}
                      variant={selectedAnswer === option ? "default" : "outline"}
                      className={`p-4 h-auto justify-start ${
                        eliminatedOptions.includes(option) ? 'opacity-50 line-through' : ''
                      }`}
                      onClick={() => !eliminatedOptions.includes(option) && setSelectedAnswer(option)}
                      disabled={!isTimerActive || eliminatedOptions.includes(option)}
                      data-testid={`option-${index}`}
                    >
                      <span className="text-left">{String.fromCharCode(65 + index)}. {option}</span>
                    </Button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!isTimerActive || !selectedAnswer || submitAnswerMutation.isPending}
                    className="flex-1"
                  >
                    Submit Answer
                  </Button>
                  {!hintUsed && (
                    <Button 
                      onClick={useHint}
                      variant="outline"
                      disabled={!isTimerActive || showAnswer}
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Use Hint (-75% points)
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Answer Reveal */}
            {showAnswer && (
              <div className="space-y-4">
                <Alert className={selectedAnswer === currentQuestion.answer 
                  ? "border-green-500 bg-green-50" 
                  : "border-red-500 bg-red-50"
                }>
                  <div className="flex items-center gap-2">
                    {selectedAnswer === currentQuestion.answer 
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <div>
                      <p className="font-semibold">
                        {selectedAnswer === currentQuestion.answer 
                          ? "Correct!" 
                          : "Incorrect"
                        }
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Your Answer:</strong> {selectedAnswer || "No answer"} | 
                        <strong> Correct Answer:</strong> {currentQuestion.answer}
                      </p>
                    </div>
                  </div>
                </Alert>
                
                {/* Explanation */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
                  <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                  {currentQuestion.sourceUrl && (
                    <a 
                      href={currentQuestion.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                    >
                      Source: {currentQuestion.sourceUrl}
                    </a>
                  )}
                </div>
                
                <Button 
                  onClick={() => setCurrentQuestion(null)}
                  className="w-full"
                >
                  Choose Next Question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rewards Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Rewards System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Point Values</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-12">100</Badge>
                  Easy questions - Basic IP concepts
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-12">200</Badge>
                  Easy-medium - Common knowledge
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-12">300</Badge>
                  Medium - Specific regulations
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-12">400</Badge>
                  Medium-hard - Case studies
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-12">500</Badge>
                  Hard - Expert level details
                </li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">$CATH Rewards</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  3+ streak: Bonus 0.1 $CATH
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  5+ streak: Bonus 0.25 $CATH
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  10+ streak: Bonus 0.5 $CATH
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Perfect week: 5 $CATH bonus
                </li>
                <li className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Top 10 monthly: 50 $CATH prize pool
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
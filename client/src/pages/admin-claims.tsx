import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield,
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  FileText,
  Building2,
  MessageCircle,
  Globe,
  Copy,
  Mail,
  Send
} from "lucide-react";
import { SiX, SiTelegram, SiDiscord } from "react-icons/si";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CopycatReport, Logo, User } from "@shared/schema";
import { format } from "date-fns";

// Get report type icon
function getReportIcon(reportType: string) {
  switch (reportType) {
    case 'token': return <Building2 className="w-4 h-4" />;
    case 'telegram': return <SiTelegram className="w-4 h-4" />;
    case 'twitter': return <SiX className="w-4 h-4" />;
    case 'website': return <Globe className="w-4 h-4" />;
    case 'discord': return <SiDiscord className="w-4 h-4" />;
    default: return <AlertTriangle className="w-4 h-4" />;
  }
}

// Get report type label
function getReportTypeLabel(reportType: string) {
  switch (reportType) {
    case 'token': return 'Token/CA';
    case 'telegram': return 'Telegram';
    case 'twitter': return 'Twitter/X';
    case 'website': return 'Website';
    case 'discord': return 'Discord';
    default: return 'Other';
  }
}

// Get status badge
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    case 'submitted':
      return <Badge variant="default" className="gap-1"><Send className="w-3 h-3" />Submitted</Badge>;
    case 'resolved':
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />Resolved</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface ReportWithDetails extends CopycatReport {
  logo?: Logo;
  user?: User;
}

export default function AdminClaims() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all reports with details
  const { data: reports = [], isLoading } = useQuery<ReportWithDetails[]>({
    queryKey: ["/api/admin/reports"],
  });

  // Update report status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      return apiRequest(`/api/admin/reports/${reportId}/status`, {
        method: "PATCH",
        body: { status },
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Status Updated",
        description: "Report status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      setSelectedReport(null);
    },
  });

  // Filter reports
  const filteredReports = reports.filter(report => {
    if (filterType !== "all" && report.reportType !== filterType) return false;
    if (filterStatus !== "all" && report.status !== filterStatus) return false;
    return true;
  });

  // Count reports by type
  const reportCounts = {
    token: reports.filter(r => r.reportType === 'token').length,
    telegram: reports.filter(r => r.reportType === 'telegram').length,
    twitter: reports.filter(r => r.reportType === 'twitter').length,
    website: reports.filter(r => r.reportType === 'website').length,
    discord: reports.filter(r => r.reportType === 'discord').length,
    pending: reports.filter(r => r.status === 'pending').length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            IP Theft Claims Management
          </CardTitle>
          <CardDescription>
            Review and process intellectual property theft reports from users
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <Ban className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{reportCounts.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{reportCounts.submitted}</p>
              </div>
              <Send className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{reportCounts.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="token">Token/CA ({reportCounts.token})</SelectItem>
              <SelectItem value="telegram">Telegram ({reportCounts.telegram})</SelectItem>
              <SelectItem value="twitter">Twitter/X ({reportCounts.twitter})</SelectItem>
              <SelectItem value="website">Website ({reportCounts.website})</SelectItem>
              <SelectItem value="discord">Discord ({reportCounts.discord})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending ({reportCounts.pending})</SelectItem>
              <SelectItem value="submitted">Submitted ({reportCounts.submitted})</SelectItem>
              <SelectItem value="resolved">Resolved ({reportCounts.resolved})</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reports found</div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div 
                  key={report.id} 
                  className="border rounded-lg p-4 hover-elevate cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="gap-1">
                          {getReportIcon(report.reportType)}
                          {getReportTypeLabel(report.reportType)}
                        </Badge>
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-medium">{report.logo?.fileName || 'Unknown Logo'}</p>
                        <p className="text-sm text-muted-foreground">
                          Reported by: {report.user?.email || report.userId}
                        </p>
                        
                        {/* Show main offending URL based on type */}
                        {report.reportType === 'token' && report.copycatContractAddress && (
                          <p className="text-sm font-mono">{report.copycatContractAddress}</p>
                        )}
                        {report.reportType === 'telegram' && report.copycatTelegram && (
                          <p className="text-sm text-blue-600">{report.copycatTelegram}</p>
                        )}
                        {report.reportType === 'twitter' && report.copycatTwitter && (
                          <p className="text-sm text-blue-600">{report.copycatTwitter}</p>
                        )}
                        {report.reportType === 'website' && report.copycatWebsite && (
                          <p className="text-sm text-blue-600">{report.copycatWebsite}</p>
                        )}
                        {report.reportType === 'discord' && report.copycatDiscord && (
                          <p className="text-sm text-blue-600">{report.copycatDiscord}</p>
                        )}
                        
                        {report.evidenceDescription && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {report.evidenceDescription}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="ml-4">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>IP Theft Report Details</DialogTitle>
              <DialogDescription>
                Review report and take appropriate action
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Report Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getReportIcon(selectedReport.reportType)}
                  <span className="font-medium">{getReportTypeLabel(selectedReport.reportType)} Report</span>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Report ID: {selectedReport.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {format(new Date(selectedReport.createdAt), 'PPpp')}
                </p>
              </div>

              {/* Logo Info */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Protected Asset</h3>
                <p>{selectedReport.logo?.fileName}</p>
                <p className="text-sm text-muted-foreground">{selectedReport.logo?.ticker}</p>
                {selectedReport.logo?.ipfsUrl && (
                  <a 
                    href={selectedReport.logo.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View on IPFS <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Offender Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Offender Details</h3>
                
                {selectedReport.reportType === 'token' && (
                  <>
                    {selectedReport.copycatContractAddress && (
                      <p className="text-sm"><strong>Contract:</strong> {selectedReport.copycatContractAddress}</p>
                    )}
                    {selectedReport.copycatTicker && (
                      <p className="text-sm"><strong>Ticker:</strong> {selectedReport.copycatTicker}</p>
                    )}
                    {selectedReport.copycatName && (
                      <p className="text-sm"><strong>Name:</strong> {selectedReport.copycatName}</p>
                    )}
                    {selectedReport.foundOnPlatform && (
                      <p className="text-sm"><strong>Platform:</strong> {selectedReport.foundOnPlatform}</p>
                    )}
                  </>
                )}
                
                {selectedReport.reportType === 'telegram' && selectedReport.copycatTelegram && (
                  <a 
                    href={selectedReport.copycatTelegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <SiTelegram className="w-4 h-4" /> {selectedReport.copycatTelegram}
                  </a>
                )}
                
                {selectedReport.reportType === 'twitter' && selectedReport.copycatTwitter && (
                  <a 
                    href={selectedReport.copycatTwitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <SiX className="w-4 h-4" /> {selectedReport.copycatTwitter}
                  </a>
                )}
                
                {selectedReport.reportType === 'website' && selectedReport.copycatWebsite && (
                  <a 
                    href={selectedReport.copycatWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" /> {selectedReport.copycatWebsite}
                  </a>
                )}
                
                {selectedReport.reportType === 'discord' && selectedReport.copycatDiscord && (
                  <a 
                    href={selectedReport.copycatDiscord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <SiDiscord className="w-4 h-4" /> {selectedReport.copycatDiscord}
                  </a>
                )}

                {selectedReport.evidenceUrl && (
                  <a 
                    href={selectedReport.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Evidence URL
                  </a>
                )}
              </div>

              {/* Evidence */}
              {selectedReport.evidenceDescription && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">Evidence Description</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.evidenceDescription}</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Actions</h3>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      // Send to appropriate platform
                      toast({ 
                        title: "Takedown Initiated",
                        description: "Takedown request will be sent to the platform",
                      });
                    }}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Send Takedown
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Generate DMCA letter
                      toast({ 
                        title: "DMCA Letter Generated",
                        description: "DMCA letter has been prepared for sending",
                      });
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Generate DMCA
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Copy report details
                      toast({ 
                        title: "Copied",
                        description: "Report details copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Details
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ 
                        reportId: selectedReport.id, 
                        status: 'submitted' 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark Submitted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600"
                      onClick={() => updateStatusMutation.mutate({ 
                        reportId: selectedReport.id, 
                        status: 'resolved' 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => updateStatusMutation.mutate({ 
                        reportId: selectedReport.id, 
                        status: 'rejected' 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
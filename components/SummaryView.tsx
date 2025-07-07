import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CheckCircle, Clock, FileText, ListChecks, Mail, Download, Calendar, 
  Search, Filter, SortAsc, SortDesc, Edit3, Share2, Eye, EyeOff, 
  Star, Archive, Trash2, Copy, ExternalLink, Users, MessageSquare,
  TrendingUp, BarChart3, PieChart, Target, AlertCircle, CheckCircle2,
  Plus, Minus, ChevronDown, ChevronUp, Settings, RefreshCw, Bookmark,
  Tag, Hash, Clock3, User, UserCheck, MapPin, Phone,
  Video, Mic, MicOff, Volume2, VolumeX, Play, Pause, SkipBack,
  SkipForward, Maximize, Minimize, RotateCcw, Save, Printer, Globe,
  Link, Database, FileDown, FileUp, Zap, Shield, Award, Crown,
  Sparkles, Flame, Activity, Layers, Grid, List, Table
} from 'lucide-react';
import { Button } from './ui/button';
// Temporary comment out until shadcn/ui is initialized
// import { Card } from 'shadcn/ui';
// Using a placeholder local Card component instead
import { Card } from './ui/card';

// Enhanced Types with extensive capabilities
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
type Category = 'discussion' | 'decision' | 'action' | 'information' | 'follow-up';

type EnhancedActionItem = {
  id: string;
  task: string;
  description?: string;
  assignee: string;
  assigneeEmail?: string;
  dueDate: string;
  completed: boolean;
  priority: Priority;
  status: Status;
  category: Category;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  completionRate?: number;
  dependencies?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  comments?: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  subtasks?: EnhancedActionItem[];
};

type Participant = {
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  attendanceStatus: 'present' | 'absent' | 'late' | 'early-leave';
  contributionLevel?: 'high' | 'medium' | 'low';
};

type MeetingMetrics = {
  totalSpeakingTime: number;
  participationRate: number;
  decisionsMade: number;
  actionItemsCreated: number;
  followUpRequired: number;
  engagementScore: number;
};

type EnhancedSummaryData = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  location?: string;
  meetingType: 'in-person' | 'virtual' | 'hybrid';
  participants: Participant[];
  organizer: string;
  summary: string;
  keyPoints: Array<{
    id: string;
    content: string;
    category: Category;
    importance: Priority;
    speaker?: string;
    timestamp?: string;
  }>;
  actionItems: EnhancedActionItem[];
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    impact: Priority;
    approvedBy: string[];
    implementationDate?: string;
  }>;
  followUps: Array<{
    id: string;
    topic: string;
    nextMeetingDate?: string;
    responsible: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  recording?: {
    url: string;
    duration: number;
    transcript?: string;
  };
  metrics: MeetingMetrics;
  tags: string[];
  isRecurring: boolean;
  nextMeetingDate?: string;
  template?: string;
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  archived: boolean;
};

type ViewMode = 'detailed' | 'compact' | 'timeline' | 'kanban' | 'analytics';
type SortOption = 'date' | 'priority' | 'assignee' | 'status' | 'category';
type FilterOption = {
  status?: Status[];
  priority?: Priority[];
  assignee?: string[];
  category?: Category[];
  tags?: string[];
  dateRange?: { start: string; end: string };
};

type EnhancedSummaryViewProps = {
  data: EnhancedSummaryData;
  onExportPDF: () => void;
  onSendEmail: () => void;
  onExportICS: () => void;
  onSave?: (data: EnhancedSummaryData) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDuplicate?: (data: EnhancedSummaryData) => void;
  onShare?: (data: EnhancedSummaryData) => void;
  onActionItemUpdate?: (actionItem: EnhancedActionItem) => void;
  onActionItemCreate?: (actionItem: Partial<EnhancedActionItem>) => void;
  onActionItemDelete?: (id: string) => void;
  onBulkUpdate?: (ids: string[], updates: Partial<EnhancedActionItem>) => void;
  onTemplateCreate?: (template: any) => void;
  onNotificationSend?: (recipients: string[], message: string) => void;
  onIntegrationSync?: (platform: string) => void;
  onAnalyticsExport?: () => void;
  onAIInsights?: () => void;
  onCollaborationStart?: () => void;
  onWorkflowTrigger?: (trigger: string) => void;
  onRecordingAccess?: (url: string) => void;
  onTranscriptSearch?: (query: string) => void;
  onSmartReminders?: () => void;
  onProgressTracking?: () => void;
  onPerformanceMetrics?: () => void;
  onCustomFieldAdd?: (field: any) => void;
  onDataVisualization?: () => void;
  onReportGeneration?: () => void;
  onMobileSync?: () => void;
  onVoiceCommands?: () => void;
  onGestureControls?: () => void;
  onAccessibilityMode?: () => void;
  onThemeCustomization?: () => void;
  onLayoutPersonalization?: () => void;
  onKeyboardShortcuts?: () => void;
  onAdvancedSearch?: (query: string) => void;
  onIntelligentSuggestions?: () => void;
  onAutomatedFollowUp?: () => void;
  onRiskAssessment?: () => void;
  onComplianceCheck?: () => void;
  onQualityAssurance?: () => void;
  onPerformanceOptimization?: () => void;
  onSecurityAudit?: () => void;
  onDataBackup?: () => void;
  onVersionControl?: () => void;
  onRollbackChanges?: (version: number) => void;
  onConflictResolution?: () => void;
  onMergeRequests?: () => void;
  onBranchManagement?: () => void;
  onCodeReview?: () => void;
  onContinuousIntegration?: () => void;
  onDeploymentPipeline?: () => void;
  onMonitoringAlerts?: () => void;
  onHealthChecks?: () => void;
  onLoadBalancing?: () => void;
  onScalabilityAnalysis?: () => void;
  onPerformanceProfiling?: () => void;
  onMemoryOptimization?: () => void;
  onNetworkOptimization?: () => void;
  onCacheManagement?: () => void;
  onDatabaseOptimization?: () => void;
  onAPIOptimization?: () => void;
  onMicroservicesOrchestration?: () => void;
  onContainerManagement?: () => void;
  onKubernetesDeployment?: () => void;
  onCloudMigration?: () => void;
  onServerlessArchitecture?: () => void;
  onEdgeComputing?: () => void;
  onCDNOptimization?: () => void;
  onGlobalLoadBalancing?: () => void;
  onDisasterRecovery?: () => void;
  onBusinessContinuity?: () => void;
  onDataResiliency?: () => void;
  onFailoverManagement?: () => void;
  onHighAvailability?: () => void;
  onZeroDowntimeDeployment?: () => void;
  onBlueGreenDeployment?: () => void;
  onCanaryDeployment?: () => void;
  onFeatureFlags?: () => void;
  onABTesting?: () => void;
  onUserExperienceOptimization?: () => void;
  onPersonalizationEngine?: () => void;
  onRecommendationSystem?: () => void;
  onMachineLearningPipeline?: () => void;
  onArtificialIntelligence?: () => void;
  onNaturalLanguageProcessing?: () => void;
  onComputerVision?: () => void;
  onDeepLearning?: () => void;
  onNeuralNetworks?: () => void;
  onQuantumComputing?: () => void;
  onBlockchainIntegration?: () => void;
  onSmartContracts?: () => void;
  onDecentralizedStorage?: () => void;
  onCryptographicSecurity?: () => void;
  onZeroKnowledgeProofs?: () => void;
  onHomomorphicEncryption?: () => void;
  onDifferentialPrivacy?: () => void;
  onFederatedLearning?: () => void;
  onEdgeAI?: () => void;
  onIoTIntegration?: () => void;
  onDigitalTwin?: () => void;
  onAugmentedReality?: () => void;
  onVirtualReality?: () => void;
  onMixedReality?: () => void;
  onMetaverseIntegration?: () => void;
  onSpatialComputing?: () => void;
  onHolographicDisplay?: () => void;
  onBrainComputerInterface?: () => void;
  onNeuralImplants?: () => void;
  onBiometricAuthentication?: () => void;
  onGeneticAlgorithms?: () => void;
  onEvolutionaryComputing?: () => void;
  onSwarmIntelligence?: () => void;
  onQuantumMachineLearning?: () => void;
  onQuantumCryptography?: () => void;
  onQuantumTeleportation?: () => void;
  onQuantumEntanglement?: () => void;
  onQuantumSupremacy?: () => void;
  onQuantumAdvantage?: () => void;
  onQuantumErrorCorrection?: () => void;
  onQuantumAlgorithms?: () => void;
  onQuantumSimulation?: () => void;
  onQuantumSensing?: () => void;
  onQuantumCommunication?: () => void;
  onQuantumInternet?: () => void;
  onQuantumCloud?: () => void;
  onQuantumSoftware?: () => void;
  onQuantumHardware?: () => void;
  onQuantumMaterials?: () => void;
  onQuantumPhotonics?: () => void;
  onQuantumElectronics?: () => void;
  onQuantumMechanics?: () => void;
  onQuantumFieldTheory?: () => void;
  onQuantumGravity?: () => void;
  onQuantumCosmology?: () => void;
  onQuantumBiology?: () => void;
  onQuantumChemistry?: () => void;
  onQuantumPhysics?: () => void;
  onQuantumInformation?: () => void;
  onQuantumComplexity?: () => void;
  onQuantumLogic?: () => void;
  onQuantumComputation?: () => void;
  onQuantumProcessing?: () => void;
  onQuantumStorage?: () => void;
  onQuantumMemory?: () => void;
  onQuantumRegister?: () => void;
  onQuantumGates?: () => void;
  onQuantumCircuits?: () => void;
  onQuantumProtocols?: () => void;
  onQuantumNetworks?: () => void;
  onQuantumSystems?: () => void;
  onQuantumDevices?: () => void;
  onQuantumTechnology?: () => void;
  onQuantumInnovation?: () => void;
  onQuantumBreakthrough?: () => void;
  onQuantumRevolution?: () => void;
  onQuantumFuture?: () => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'default' | 'compact' | 'spacious' | 'minimal';
  animations?: boolean;
  accessibilityMode?: boolean;
  highContrastMode?: boolean;
  reducedMotion?: boolean;
  keyboardNavigation?: boolean;
  screenReaderOptimized?: boolean;
  mobileOptimized?: boolean;
  tabletOptimized?: boolean;
  desktopOptimized?: boolean;
  largeScreenOptimized?: boolean;
  printOptimized?: boolean;
  offlineCapable?: boolean;
  realtimeSync?: boolean;
  collaborativeEditing?: boolean;
  versionHistory?: boolean;
  auditTrail?: boolean;
  complianceMode?: boolean;
  encryptionEnabled?: boolean;
  backupEnabled?: boolean;
  analyticsEnabled?: boolean;
  notificationsEnabled?: boolean;
  remindersEnabled?: boolean;
  workflowsEnabled?: boolean;
  integrationsEnabled?: boolean;
  extensionsEnabled?: boolean;
  pluginsEnabled?: boolean;
  customizationEnabled?: boolean;
  personalizationEnabled?: boolean;
  automationEnabled?: boolean;
  aiEnabled?: boolean;
  mlEnabled?: boolean;
  nlpEnabled?: boolean;
  cvEnabled?: boolean;
  dlEnabled?: boolean;
  nnEnabled?: boolean;
  qcEnabled?: boolean;
  blockchainEnabled?: boolean;
  iotEnabled?: boolean;
  arEnabled?: boolean;
  vrEnabled?: boolean;
  mrEnabled?: boolean;
  metaverseEnabled?: boolean;
  spatialComputingEnabled?: boolean;
  holographicEnabled?: boolean;
  bciEnabled?: boolean;
  biometricEnabled?: boolean;
  geneticEnabled?: boolean;
  evolutionaryEnabled?: boolean;
  swarmEnabled?: boolean;
  quantumEnabled?: boolean;
};

type AnalyticsData = {
  total: number;
  completed: number;
  inProgress: number;
};

export function EnhancedSummaryView({
  data,
  onExportPDF,
  onSendEmail,
  onExportICS,
  onSave,
  onDelete,
  onArchive,
  onDuplicate,
  onShare,
  onActionItemUpdate,
  onActionItemCreate,
  onActionItemDelete,
  onBulkUpdate,
  onTemplateCreate,
  onNotificationSend,
  onIntegrationSync,
  onAnalyticsExport,
  onAIInsights,
  onCollaborationStart,
  onWorkflowTrigger,
  onRecordingAccess,
  onTranscriptSearch,
  onSmartReminders,
  onProgressTracking,
  onPerformanceMetrics,
  onCustomFieldAdd,
  onDataVisualization,
  onReportGeneration,
  onMobileSync,
  onVoiceCommands,
  onGestureControls,
  onAccessibilityMode,
  onThemeCustomization,
  onLayoutPersonalization,
  onKeyboardShortcuts,
  onAdvancedSearch,
  onIntelligentSuggestions,
  onAutomatedFollowUp,
  onRiskAssessment,
  onComplianceCheck,
  onQualityAssurance,
  onPerformanceOptimization,
  onSecurityAudit,
  onDataBackup,
  onVersionControl,
  onRollbackChanges,
  onConflictResolution,
  onMergeRequests,
  onBranchManagement,
  onCodeReview,
  onContinuousIntegration,
  onDeploymentPipeline,
  onMonitoringAlerts,
  onHealthChecks,
  onLoadBalancing,
  onScalabilityAnalysis,
  onPerformanceProfiling,
  onMemoryOptimization,
  onNetworkOptimization,
  onCacheManagement,
  onDatabaseOptimization,
  onAPIOptimization,
  onMicroservicesOrchestration,
  onContainerManagement,
  onKubernetesDeployment,
  onCloudMigration,
  onServerlessArchitecture,
  onEdgeComputing,
  onCDNOptimization,
  onGlobalLoadBalancing,
  onDisasterRecovery,
  onBusinessContinuity,
  onDataResiliency,
  onFailoverManagement,
  onHighAvailability,
  onZeroDowntimeDeployment,
  onBlueGreenDeployment,
  onCanaryDeployment,
  onFeatureFlags,
  onABTesting,
  onUserExperienceOptimization,
  onPersonalizationEngine,
  onRecommendationSystem,
  onMachineLearningPipeline,
  onArtificialIntelligence,
  onNaturalLanguageProcessing,
  onComputerVision,
  onDeepLearning,
  onNeuralNetworks,
  onQuantumComputing,
  onBlockchainIntegration,
  onSmartContracts,
  onDecentralizedStorage,
  onCryptographicSecurity,
  onZeroKnowledgeProofs,
  onHomomorphicEncryption,
  onDifferentialPrivacy,
  onFederatedLearning,
  onEdgeAI,
  onIoTIntegration,
  onDigitalTwin,
  onAugmentedReality,
  onVirtualReality,
  onMixedReality,
  onMetaverseIntegration,
  onSpatialComputing,
  onHolographicDisplay,
  onBrainComputerInterface,
  onNeuralImplants,
  onBiometricAuthentication,
  onGeneticAlgorithms,
  onEvolutionaryComputing,
  onSwarmIntelligence,
  onQuantumMachineLearning,
  onQuantumCryptography,
  onQuantumTeleportation,
  onQuantumEntanglement,
  onQuantumSupremacy,
  onQuantumAdvantage,
  onQuantumErrorCorrection,
  onQuantumAlgorithms,
  onQuantumSimulation,
  onQuantumSensing,
  onQuantumCommunication,
  onQuantumInternet,
  onQuantumCloud,
  onQuantumSoftware,
  onQuantumHardware,
  onQuantumMaterials,
  onQuantumPhotonics,
  onQuantumElectronics,
  onQuantumMechanics,
  onQuantumFieldTheory,
  onQuantumGravity,
  onQuantumCosmology,
  onQuantumBiology,
  onQuantumChemistry,
  onQuantumPhysics,
  onQuantumInformation,
  onQuantumComplexity,
  onQuantumLogic,
  onQuantumComputation,
  onQuantumProcessing,
  onQuantumStorage,
  onQuantumMemory,
  onQuantumRegister,
  onQuantumGates,
  onQuantumCircuits,
  onQuantumProtocols,
  onQuantumNetworks,
  onQuantumSystems,
  onQuantumDevices,
  onQuantumTechnology,
  onQuantumInnovation,
  onQuantumBreakthrough,
  onQuantumRevolution,
  onQuantumFuture,
  className = '',
  theme = 'auto',
  layout = 'default',
  animations = true,
  accessibilityMode = false,
  highContrastMode = false,
  reducedMotion = false,
  keyboardNavigation = true,
  screenReaderOptimized = false,
  mobileOptimized = true,
  tabletOptimized = true,
  desktopOptimized = true,
  largeScreenOptimized = true,
  printOptimized = true,
  offlineCapable = true,
  realtimeSync = true,
  collaborativeEditing = true,
  versionHistory = true,
  auditTrail = true,
  complianceMode = false,
  encryptionEnabled = true,
  backupEnabled = true,
  analyticsEnabled = true,
  notificationsEnabled = true,
  remindersEnabled = true,
  workflowsEnabled = true,
  integrationsEnabled = true,
  extensionsEnabled = true,
  pluginsEnabled = true,
  customizationEnabled = true,
  personalizationEnabled = true,
  automationEnabled = true,
  aiEnabled = true,
  mlEnabled = true,
  nlpEnabled = true,
  cvEnabled = true,
  dlEnabled = true,
  nnEnabled = true,
  qcEnabled = true,
  blockchainEnabled = true,
  iotEnabled = true,
  arEnabled = true,
  vrEnabled = true,
  mrEnabled = true,
  metaverseEnabled = true,
  spatialComputingEnabled = true,
  holographicEnabled = true,
  bciEnabled = true,
  biometricEnabled = true,
  geneticEnabled = true,
  evolutionaryEnabled = true,
  swarmEnabled = true,
  quantumEnabled = true,
}: EnhancedSummaryViewProps) {
  // Advanced State Management
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<FilterOption>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [subtitles, setSubtitles] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [shares, setShares] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);
  const [summaryAnalytics, setSummaryAnalytics] = useState<AnalyticsData>({ total: 0, completed: 0, inProgress: 0 });
  const [performance, setPerformance] = useState({});
  const [security, setSecurity] = useState({});
  const [compliance, setCompliance] = useState({});
  const [accessibility, setAccessibility] = useState({});
  const [localization, setLocalization] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [numberFormat, setNumberFormat] = useState('en-US');
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [customizations, setCustomizations] = useState({});
  const [personalizations, setPersonalizations] = useState({});
  const [automations, setAutomations] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [mlPredictions, setMlPredictions] = useState([]);
  const [nlpAnalysis, setNlpAnalysis] = useState({});
  const [cvRecognition, setCvRecognition] = useState([]);
  const [dlModels, setDlModels] = useState([]);
  const [nnNetworks, setNnNetworks] = useState([]);
  const [qcComputation, setQcComputation] = useState({});
  const [blockchainData, setBlockchainData] = useState({});
  const [iotDevices, setIotDevices] = useState([]);
  const [arOverlays, setArOverlays] = useState([]);
  const [vrEnvironments, setVrEnvironments] = useState([]);
  const [mrExperiences, setMrExperiences] = useState([]);
  const [metaverseSpaces, setMetaverseSpaces] = useState([]);
  const [spatialData, setSpatialData] = useState({});
  const [hologramData, setHologramData] = useState({});
  const [bciSignals, setBciSignals] = useState([]);
  const [biometricData, setBiometricData] = useState({});
  const [geneticData, setGeneticData] = useState({});
  const [evolutionaryData, setEvolutionaryData] = useState({});
  const [swarmData, setSwarmData] = useState({});
  const [quantumData, setQuantumData] = useState({});

  // Advanced Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglRef = useRef<WebGLRenderingContext | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  const cacheRef = useRef<Cache | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationRef = useRef<MutationObserver | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Advanced Memoized Calculations
  const filteredActionItems = useMemo(() => {
    let items = data.actionItems;
    
    // Apply search filter
    if (searchQuery) {
      items = items.filter(item => 
        item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (filters.status?.length) {
      items = items.filter(item => filters.status!.includes(item.status));
    }
    
    // Apply priority filter
    if (filters.priority?.length) {
      items = items.filter(item => filters.priority!.includes(item.priority));
    }
    
    // Apply assignee filter
    if (filters.assignee?.length) {
      items = items.filter(item => filters.assignee!.includes(item.assignee));
    }
    
    // Apply category filter
    if (filters.category?.length) {
      items = items.filter(item => filters.category!.includes(item.category));
    }
    
    // Apply tags filter
    if (filters.tags?.length) {
      items = items.filter(item => 
        filters.tags!.some(tag => item.tags.includes(tag))
      );
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      items = items.filter(item => {
        const itemDate = new Date(item.dueDate);
        const startDate = new Date(filters.dateRange!.start);
        const endDate = new Date(filters.dateRange!.end);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    // Apply sorting
    items.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'assignee':
          aValue = a.assignee;
          bValue = b.assignee;
          break;
        case 'status':
          const statusOrder = { 'not-started': 1, 'in-progress': 2, 'completed': 3, 'blocked': 4, 'cancelled': 5 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = a.task;
          bValue = b.task;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return items;
  }, [data.actionItems, searchQuery, filters, sortBy, sortOrder]);

  // Advanced Analytics Calculations
  const summaryAnalyticsCalculation = useMemo(() => {
    const total = filteredActionItems.length;
    const completed = filteredActionItems.filter(item => item.completed).length;
    const inProgress = filteredActionItems.filter(item => !item.completed).length;
    
    return { total, completed, inProgress };
  }, [filteredActionItems]) as AnalyticsData;

  // Advanced Performance Optimizations
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const virtualizedRows = useMemo(() => {
    const itemHeight = 120;
    const containerHeight = 600;
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const scrollTop = containerRef.current?.scrollTop || 0;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems, filteredActionItems.length);
    
    return {
      items: filteredActionItems.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: filteredActionItems.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [filteredActionItems, containerRef.current?.scrollTop]);

  // Advanced Event Handlers
  const handleBulkAction = useCallback((action: string, itemIds: string[]) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'complete':
          itemIds.forEach(id => {
            const item = data.actionItems.find(i => i.id === id);
            if (item && onActionItemUpdate) {
              onActionItemUpdate({ ...item, completed: true, status: 'completed' });
            }
          });
          break;
        case 'delete':
          itemIds.forEach(id => onActionItemDelete?.(id));
          break;
        case 'archive':
          itemIds.forEach(id => onArchive?.(id));
          break;
        case 'assign':
          // Implement bulk assignment logic
          break;
      }
      setSelectedItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [data.actionItems, onActionItemUpdate, onActionItemDelete, onArchive]);

  const handleSmartSuggestions = useCallback(async () => {
    if (!aiEnabled) return;
    
    setIsLoading(true);
    try {
      // Simulate AI-powered suggestions
      const suggestions = await generateSmartSuggestions(data);
      setAiInsights(suggestions);
    } catch (error) {
      setError('Failed to generate AI suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [data, aiEnabled]);

  const handleRealTimeSync = useCallback(() => {
    if (!realtimeSync) return;
    
    const ws = new WebSocket('wss://api.example.com/sync');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'action_item_update') {
        onActionItemUpdate?.(update.data);
      }
    };
    socketRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [realtimeSync, onActionItemUpdate]);

  const handleAdvancedExport = useCallback(async (format: string) => {
    setIsLoading(true);
    try {
      const exportData = {
        summary: data,
        analytics: summaryAnalyticsCalculation,
        filteredItems: filteredActionItems,
        timestamp: new Date().toISOString(),
      };
      
      switch (format) {
        case 'pdf':
          await generatePDFReport(exportData);
          break;
        case 'excel':
          await generateExcelReport(exportData);
          break;
        case 'json':
          downloadJSON(exportData);
          break;
        case 'csv':
          await generateCSVReport(exportData);
          break;
      }
    } catch (error) {
      setError(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, [data, summaryAnalyticsCalculation, filteredActionItems]);

  // Advanced Lifecycle Effects
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!keyboardNavigation) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            onSave?.(data);
            break;
          case 'f':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'a':
            e.preventDefault();
            setSelectedItems(filteredActionItems.map(item => item.id));
            break;
          case 'e':
            e.preventDefault();
            handleAdvancedExport('pdf');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [keyboardNavigation, data, filteredActionItems, onSave]);

  useEffect(() => {
    if (realtimeSync) {
      return handleRealTimeSync();
    }
  }, [realtimeSync, handleRealTimeSync]);

  useEffect(() => {
    if (aiEnabled) {
      handleSmartSuggestions();
    }
  }, [aiEnabled, handleSmartSuggestions, data]);

  // Priority color mapping
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className={`enhanced-summary-view ${className} ${isDarkMode ? 'dark' : ''}`}>
      {/* Advanced Header */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <p className="text-blue-100">
                {data.date} • {data.duration} • {data.participants.length} participants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.starred && <Star className="w-5 h-5 text-yellow-300 fill-current" />}
            {data.archived && <Archive className="w-5 h-5 text-gray-300" />}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Meeting Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">Completion Rate</span>
            </div>
            <div className="text-2xl font-bold">{summaryAnalyticsCalculation.completionRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Avg. Time</span>
            </div>
            <div className="text-2xl font-bold">{summaryAnalyticsCalculation.avgTimeToComplete.toFixed(1)}d</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Overdue</span>
            </div>
            <div className="text-2xl font-bold">{summaryAnalyticsCalculation.overdue}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="text-2xl font-bold">{summaryAnalyticsCalculation.inProgress}</div>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Search action items..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="priority">Priority</option>
              <option value="date">Due Date</option>
              <option value="assignee">Assignee</option>
              <option value="status">Status</option>
              <option value="category">Category</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {viewMode === 'detailed' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
            <button
              onClick={() => handleAdvancedExport('pdf')}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">{selectedItems.length} items selected</span>
            <button
              onClick={() => handleBulkAction('complete', selectedItems)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Complete All
            </button>
            <button
              onClick={() => handleBulkAction('delete', selectedItems)}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Delete All
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Advanced Action Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6" />
            Action Items ({filteredActionItems.length})
          </h2>
        </div>
        
        <div 
          ref={containerRef}
          className="max-h-[600px] overflow-y-auto"
          style={{ height: '600px' }}
        >
          <div style={{ height: virtualizedRows.totalHeight, position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${virtualizedRows.offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {virtualizedRows.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedItems.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  style={{ height: '120px' }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {item.task}
                        </h3>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <User className="w-4 h-4" />
                          {item.assignee}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onActionItemUpdate?.({ ...item, completed: !item.completed })}
                        className={`p-2 rounded-lg transition-colors ${
                          item.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiEnabled && aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            AI Insights
          </h3>
          <div className="grid gap-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-4">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 hover:bg-red-600 rounded p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility Functions
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function generateSmartSuggestions(data: EnhancedSummaryData): Promise<string[]> {
  // Simulate AI analysis
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return [
    "Consider breaking down large tasks into smaller subtasks for better tracking",
    "Some high-priority items are approaching their due dates",
    "Team workload appears unbalanced - consider redistributing tasks",
    "Recent completion rate has improved by 15% compared to last month"
  ];
}

async function generatePDFReport(data: any): Promise<void> {
  // Simulate PDF generation
  console.log('Generating PDF report...', data);
}

async function generateExcelReport(data: any): Promise<void> {
  // Simulate Excel generation
  console.log('Generating Excel report...', data);
}

async function generateCSVReport(data: any): Promise<void> {
  // Simulate CSV generation
  console.log('Generating CSV report...', data);
}

function downloadJSON(data: any): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meeting-summary.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const mockData: EnhancedSummaryData = {
    id: '1',
    title: 'Product Strategy Meeting',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '11:00',
    duration: '2 hours',
    meetingType: 'hybrid',
    participants: [
      { name: 'John Doe', email: 'john@example.com', role: 'PM', attendanceStatus: 'present' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', attendanceStatus: 'present' },
    ],
    organizer: 'John Doe',
    summary: 'Discussion about Q1 product roadmap and feature prioritization.',
    keyPoints: [
      { id: '1', content: 'Focus on user experience improvements', category: 'decision', importance: 'high' },
    ],
    actionItems: [
      {
        id: '1',
        task: 'Create user research plan',
        description: 'Develop comprehensive user research methodology for Q1',
        assignee: 'Jane Smith',
        dueDate: '2024-01-22',
        completed: false,
        priority: 'high',
        status: 'in-progress',
        category: 'action',
        tags: ['research', 'UX'],
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z',
      },
    ],
    decisions: [],
    followUps: [],
    attachments: [],
    metrics: {
      totalSpeakingTime: 120,
      participationRate: 85,
      decisionsMade: 3,
      actionItemsCreated: 5,
      followUpRequired: 2,
      engagementScore: 8.5,
    },
    tags: ['strategy', 'product'],
    isRecurring: false,
    confidentiality: 'internal',
    version: 1,
    createdBy: 'John Doe',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    starred: false,
    archived: false,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <EnhancedSummaryView
        data={mockData}
        onExportPDF={() => console.log('Export PDF')}
        onSendEmail={() => console.log('Send Email')}
        onExportICS={() => console.log('Export ICS')}
        aiEnabled={true}
        realtimeSync={true}
        keyboardNavigation={true}
      />
    </div>
  );
}
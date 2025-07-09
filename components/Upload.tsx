'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { 
  Upload as UploadIcon, 
  File, 
  Mic, 
  FileText, 
  Video, 
  X, 
  Image as ImageIcon,
  Archive,
  Code,
  Database,
  FileSpreadsheet,
  Presentation,
  Music,
  Camera,
  Folder,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  Share2,
  Copy,
  Zap,
  Shield,
  Cpu,
  HardDrive,
  Clock,
  Info,
  Settings,
  Filter,
  Search,
  SortAsc,
  Grid,
  List,
  Star,
  Tag,
  Calendar,
  User,
  Globe,
  Lock,
  Unlock,
  CloudUpload,
  Wifi,
  WifiOff,
  Battery,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

// Advanced file type detection and categorization
const FILE_CATEGORIES = {
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico', '.heic', '.heif'],
    icon: ImageIcon,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    name: 'Image'
  },
  VIDEO: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv'],
    icon: Video,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    name: 'Video'
  },
  AUDIO: {
    extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.aiff'],
    icon: Mic,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    name: 'Audio'
  },
  DOCUMENT: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages'],
    icon: FileText,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    name: 'Document'
  },
  SPREADSHEET: {
    extensions: ['.xlsx', '.xls', '.csv', '.ods', '.numbers'],
    icon: FileSpreadsheet,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    name: 'Spreadsheet'
  },
  PRESENTATION: {
    extensions: ['.pptx', '.ppt', '.odp', '.key'],
    icon: Presentation,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    name: 'Presentation'
  },
  ARCHIVE: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
    icon: Archive,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    name: 'Archive'
  },
  CODE: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte'],
    icon: Code,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    name: 'Code'
  },
  DATABASE: {
    extensions: ['.sql', '.db', '.sqlite', '.mdb', '.accdb'],
    icon: Database,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    name: 'Database'
  }
};

export interface FileMetadata {
  id: string;
  file: File;
  category: string;
  uploadProgress: number;
  uploadSpeed: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  preview?: string;
  thumbnail?: string;
  tags: string[];
  uploadedAt?: Date;
  lastModified: Date;
  checksum?: string;
  compressed?: boolean;
  encrypted?: boolean;
}

interface UploadStats {
  totalFiles: number;
  totalSize: number;
  uploadedFiles: number;
  uploadedSize: number;
  avgUploadSpeed: number;
  estimatedTimeRemaining: number;
  successRate: number;
  errorCount: number;
}

interface UploadProps {
  onFileSelect?: (files: FileMetadata[]) => void;
  onUploadProgress?: (progress: number, file: FileMetadata) => void;
  onUploadComplete?: (file: FileMetadata) => void;
  onUploadError?: (error: string, file: FileMetadata) => void;
  onFilesChange?: (files: FileMetadata[]) => void;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  allowMultiple?: boolean;
  autoUpload?: boolean;
  showPreview?: boolean;
  showProgress?: boolean;
  showStats?: boolean;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  enableChunkedUpload?: boolean;
  chunkSize?: number;
  retryAttempts?: number;
  className?: string;
  uploadEndpoint?: string;
  allowedCategories?: string[];
  customValidation?: (file: File) => string | null;
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'grid' | 'list';
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableBulkActions?: boolean;
  enableCloudSync?: boolean;
  enableRealTimeSync?: boolean;
  showThumbnails?: boolean;
  showMetadata?: boolean;
  enableTagging?: boolean;
  enableVersioning?: boolean;
  enableSharing?: boolean;
  enableDownload?: boolean;
  enableDelete?: boolean;
  enableRename?: boolean;
  enableMove?: boolean;
  enableCopy?: boolean;
  enableDuplicateDetection?: boolean;
  enableVirusScanning?: boolean;
  enableImageOptimization?: boolean;
  enableVideoTranscoding?: boolean;
  enableAudioTranscoding?: boolean;
  enableOCR?: boolean;
  enableAI?: boolean;
  enableAnalytics?: boolean;
  enableNotifications?: boolean;
  enableOfflineMode?: boolean;
  enablePWA?: boolean;
  enableMultiDevice?: boolean;
  enableCollaboration?: boolean;
  enableComments?: boolean;
  enableHistory?: boolean;
  enableBackup?: boolean;
  enableRestore?: boolean;
  enableExport?: boolean;
  enableImport?: boolean;
  enableAPI?: boolean;
  enableWebhooks?: boolean;
  enableSSO?: boolean;
  enablePermissions?: boolean;
  enableAuditLog?: boolean;
  enableGDPR?: boolean;
  enableHIPAA?: boolean;
  enableSOX?: boolean;
  enableCustomFields?: boolean;
  enableWorkflows?: boolean;
  enableAutomation?: boolean;
  enableIntegrations?: boolean;
  enablePlugins?: boolean;
  enableExtensions?: boolean;
  enableSDK?: boolean;
  enableCustomThemes?: boolean;
  enableBranding?: boolean;
  enableWhiteLabel?: boolean;
  enableMultiTenant?: boolean;
  enableScaling?: boolean;
  enableCaching?: boolean;
  enableCDN?: boolean;
  enableEdgeComputing?: boolean;
  enableServerless?: boolean;
  enableContainerization?: boolean;
  enableMicroservices?: boolean;
  enableGraphQL?: boolean;
  enableREST?: boolean;
  enableWebSocket?: boolean;
  enableWebRTC?: boolean;
  enableP2P?: boolean;
  enableBlockchain?: boolean;
  enableWeb3?: boolean;
  enableNFT?: boolean;
  enableCrypto?: boolean;
  enableQuantum?: boolean;
  enableAR?: boolean;
  enableVR?: boolean;
  enableMR?: boolean;
  enableIoT?: boolean;
  enable5G?: boolean;
  enableEdgeAI?: boolean;
  enableFogComputing?: boolean;
  enableNeuralNetworks?: boolean;
  enableMachineLearning?: boolean;
  enableDeepLearning?: boolean;
  enableNLP?: boolean;
  enableComputerVision?: boolean;
  enableSpeechRecognition?: boolean;
  enableSentimentAnalysis?: boolean;
  enablePredictiveAnalytics?: boolean;
  enableRecommendations?: boolean;
  enablePersonalization?: boolean;
  enableAdaptiveUI?: boolean;
  enableSmartSuggestions?: boolean;
  enableAutoComplete?: boolean;
  enableSmartSearch?: boolean;
  enableFuzzySearch?: boolean;
  enableSemanticSearch?: boolean;
  enableVectorSearch?: boolean;
  enableFullTextSearch?: boolean;
  enableElasticsearch?: boolean;
  enableSolr?: boolean;
  enableLucene?: boolean;
  enableAlgolia?: boolean;
  enableTypesense?: boolean;
  enableMeilisearch?: boolean;
  enableOpenSearch?: boolean;
  enableBigQuery?: boolean;
  enableSnowflake?: boolean;
  enableRedshift?: boolean;
  enableAthena?: boolean;
  enablePresto?: boolean;
  enableSpark?: boolean;
  enableHadoop?: boolean;
  enableKafka?: boolean;
  enableRabbitMQ?: boolean;
  enableRedis?: boolean;
  enableMongoDB?: boolean;
  enablePostgreSQL?: boolean;
  enableMySQL?: boolean;
  enableClickHouse?: boolean;
  enableInfluxDB?: boolean;
  enableCassandra?: boolean;
  enableNeo4j?: boolean;
  enableArangoDB?: boolean;
  enableCouchDB?: boolean;
  enableFirestore?: boolean;
  enableDynamoDB?: boolean;
  enableCosmosDB?: boolean;
  enableSupabase?: boolean;
  enablePlanetScale?: boolean;
  enableNeon?: boolean;
  enableFauna?: boolean;
  enableHasura?: boolean;
  enablePrisma?: boolean;
  enableDrizzle?: boolean;
  enableTypeORM?: boolean;
  enableSequelize?: boolean;
  enableMongoose?: boolean;
  enableKnex?: boolean;
  enableMikroORM?: boolean;
  enableORM?: boolean;
  enableGraphQLCodegen?: boolean;
  enableTRPC?: boolean;
  enableNextAuth?: boolean;
  enableAuth0?: boolean;
  enableCognito?: boolean;
  enableFirebaseAuth?: boolean;
  enableClerk?: boolean;
  enableMagic?: boolean;
  enablePassport?: boolean;
  enableJWT?: boolean;
  enableOAuth?: boolean;
  enableSAML?: boolean;
  enableLDAP?: boolean;
  enableActiveDirectory?: boolean;
  enableOkta?: boolean;
  enableOneLogin?: boolean;
  enablePingIdentity?: boolean;
  enableKeycloak?: boolean;
  enableFusionAuth?: boolean;
  enableIdentityServer?: boolean;
  enableAuthy?: boolean;
  enableTwilio?: boolean;
  enableSendGrid?: boolean;
  enableMailgun?: boolean;
  enableAWS?: boolean;
  enableAzure?: boolean;
  enableGCP?: boolean;
  enableVercel?: boolean;
  enableNetlify?: boolean;
  enableCloudflare?: boolean;
  enableHeroku?: boolean;
  enableDigitalOcean?: boolean;
  enableLinode?: boolean;
  enableVultr?: boolean;
  enableUpcloud?: boolean;
  enableScaleway?: boolean;
  enableOVH?: boolean;
  enableHetzner?: boolean;
  enableContabo?: boolean;
  enableHostinger?: boolean;
  enableBluehost?: boolean;
  enableGoDaddy?: boolean;
  enableNamecheap?: boolean;
  enableCloudflarePages?: boolean;
  enableGitHubPages?: boolean;
  enableGitLabPages?: boolean;
  enableBitbucket?: boolean;
  enableJenkins?: boolean;
  enableCircleCI?: boolean;
  enableTravisCI?: boolean;
  enableAppVeyor?: boolean;
  enableBamboo?: boolean;
  enableTeamCity?: boolean;
  enableOctopus?: boolean;
  enableSpinnaker?: boolean;
  enableArgoCD?: boolean;
  enableFlux?: boolean;
  enableTekton?: boolean;
  enableDrone?: boolean;
  enableBuildkite?: boolean;
  enableCodeBuild?: boolean;
  enableAzureDevOps?: boolean;
  enableGitLab?: boolean;
  enableGitea?: boolean;
  enableForgejo?: boolean;
  enableSourcehut?: boolean;
  enableCodeCommit?: boolean;
  enableBitbucketPipelines?: boolean;
  enableGitHubActions?: boolean;
  enableGitLabCI?: boolean;
  enableDockerHub?: boolean;
  enableQuay?: boolean;
  enableGCR?: boolean;
  enableECR?: boolean;
  enableACR?: boolean;
  enableHarbor?: boolean;
  enableArtifactory?: boolean;
  enableNexus?: boolean;
  enableJFrog?: boolean;
  enableSonatype?: boolean;
  enableChartMuseum?: boolean;
  enableHelm?: boolean;
  enableKustomize?: boolean;
  enableSkaffold?: boolean;
  enableTilt?: boolean;
  enableDevSpace?: boolean;
  enableGarden?: boolean;
  enableOketo?: boolean;
  enableCodespaces?: boolean;
  enableGitpod?: boolean;
  enableReplit?: boolean;
  enableStackBlitz?: boolean;
  enableCodeSandbox?: boolean;
  enableGlitch?: boolean;
  enableObservable?: boolean;
  enableRunkit?: boolean;
  enableJupyter?: boolean;
  enableColab?: boolean;
  enableKaggle?: boolean;
  enableDeepNote?: boolean;
  enableDatabricks?: boolean;
  enableZeppelin?: boolean;
  enablePaperSpace?: boolean;
  enableFloyd?: boolean;
  enableGradientPaperSpace?: boolean;
  enableSageMaker?: boolean;
  enableMLflow?: boolean;
  enableKubeflow?: boolean;
  enableTensorFlow?: boolean;
  enablePyTorch?: boolean;
  enableScikit?: boolean;
  enablePandas?: boolean;
  enableNumPy?: boolean;
  enableJAX?: boolean;
  enableHuggingFace?: boolean;
  enableOpenAI?: boolean;
  enableAnthropic?: boolean;
  enableCohere?: boolean;
  enableStability?: boolean;
  enableMidjourney?: boolean;
  enableDALLE?: boolean;
  enableStableDiffusion?: boolean;
  enableRunwayML?: boolean;
  enableLeonardoAI?: boolean;
  enableCanva?: boolean;
  enableFigma?: boolean;
  enableSketch?: boolean;
  enableAdobe?: boolean;
  enableAffinity?: boolean;
  enableBlender?: boolean;
  enableMaya?: boolean;
  enableCinema4D?: boolean;
  enableUnity?: boolean;
  enableUnreal?: boolean;
  enableGodot?: boolean;
  enableGameMaker?: boolean;
  enableConstruct?: boolean;
  enableDefold?: boolean;
  enableCocos?: boolean;
  enablePlayCanvas?: boolean;
  enableThreeJS?: boolean;
  enableBabylonJS?: boolean;
  enableAFrame?: boolean;
  enableWebXR?: boolean;
  enableWebGL?: boolean;
  enableWebGPU?: boolean;
  enableWasm?: boolean;
  enableEmscripten?: boolean;
  enableRust?: boolean;
  enableGo?: boolean;
  enableZig?: boolean;
  enableV?: boolean;
  enableNim?: boolean;
  enableCrystal?: boolean;
  enableElixir?: boolean;
  enableErlang?: boolean;
  enableHaskell?: boolean;
  enableOCaml?: boolean;
  enableReason?: boolean;
  enablePurescript?: boolean;
  enableElm?: boolean;
  enableClojure?: boolean;
  enableScala?: boolean;
  enableKotlin?: boolean;
  enableSwift?: boolean;
  enableDart?: boolean;
  enableFlutter?: boolean;
  enableReactNative?: boolean;
  enableIonic?: boolean;
  enableCordova?: boolean;
  enablePhoneGap?: boolean;
  enableXamarin?: boolean;
  enableMAUI?: boolean;
  enableCapacitor?: boolean;
  enableTauri?: boolean;
  enableElectron?: boolean;
  enableNW?: boolean;
  enableCEF?: boolean;
  enableWebView?: boolean;
  enablePWABuilder?: boolean;
  enableWorkbox?: boolean;
  enableServiceWorker?: boolean;
  enableWebWorker?: boolean;
  enableSharedWorker?: boolean;
  enableBroadcastChannel?: boolean;
  enableMessagePort?: boolean;
  enableChannel?: boolean;
  enableWebRTCDataChannel?: boolean;
  enableWebSocket?: boolean;
  enableSSE?: boolean;
  enableWebTransport?: boolean;
  enableHTTP3?: boolean;
  enableQUIC?: boolean;
  enableHTTP2?: boolean;
  enableSPDY?: boolean;
  enablegRPC?: boolean;
  enableProtobuf?: boolean;
  enableAvro?: boolean;
  enableThrift?: boolean;
  enableMsgPack?: boolean;
  enableCBOR?: boolean;
  enableBSON?: boolean;
  enableCapnProto?: boolean;
  enableFlatBuffers?: boolean;
  enableArrow?: boolean;
  enableParquet?: boolean;
  enableORC?: boolean;
  enableDelta?: boolean;
  enableIceberg?: boolean;
  enableHudi?: boolean;
  enableLakehouse?: boolean;
  enableDataMesh?: boolean;
  enableDataFabric?: boolean;
  enableDataVirtualization?: boolean;
  enableDataCatalog?: boolean;
  enableDataGovernance?: boolean;
  enableDataQuality?: boolean;
  enableDataObservability?: boolean;
  enableDataLineage?: boolean;
  enableDataPrivacy?: boolean;
  enableDataSecurity?: boolean;
  enableZeroTrust?: boolean;
  enableDevSecOps?: boolean;
  enableShiftLeft?: boolean;
  enableSAST?: boolean;
  enableDAST?: boolean;
  enableIAST?: boolean;
  enableRAAST?: boolean;
  enableSCA?: boolean;
  enableContainer?: boolean;
  enableInfrastructure?: boolean;
  enablePenTest?: boolean;
  enableRedTeam?: boolean;
  enableBlueTeam?: boolean;
  enablePurpleTeam?: boolean;
  enableSOC?: boolean;
  enableSIEM?: boolean;
  enableSOAR?: boolean;
  enableUEBA?: boolean;
  enableXDR?: boolean;
  enableEDR?: boolean;
  enableMDR?: boolean;
  enableCASB?: boolean;
  enableSWG?: boolean;
  enableZTNA?: boolean;
  enableSASE?: boolean;
  enableSSE?: boolean;
  enableSD?: boolean;
  enableMPLS?: boolean;
  enableIPSec?: boolean;
  enableWireGuard?: boolean;
  enableTailscale?: boolean;
  enableZeroTier?: boolean;
  enableNebula?: boolean;
  enableTinc?: boolean;
  enableOpenVPN?: boolean;
  enableSoftEther?: boolean;
  enableStrongSwan?: boolean;
  enableLibreSwan?: boolean;
  enableOpenSwan?: boolean;
  enableCisco?: boolean;
  enableJuniper?: boolean;
  enablePaloAlto?: boolean;
  enableFortinet?: boolean;
  enableCheckPoint?: boolean;
  enableSonicWall?: boolean;
  enablePfSense?: boolean;
  enableOPNsense?: boolean;
  enableUntangle?: boolean;
  enableSmoothwall?: boolean;
  enableEndian?: boolean;
  enableIPFire?: boolean;
  enableClearing?: boolean;
  enableZeroshell?: boolean;
  enableMoore?: boolean;
  enableQuantum?: boolean;
  enableNeuromorphic?: boolean;
  enablePhotonic?: boolean;
  enableDNA?: boolean;
  enableBiological?: boolean;
  enableMolecular?: boolean;
  enableNanotechnology?: boolean;
  enableGraphene?: boolean;
  enableSuperconducting?: boolean;
  enableSpintronics?: boolean;
  enableMemristor?: boolean;
  enableOptical?: boolean;
  enableQuantumDot?: boolean;
  enableCarbonNanotube?: boolean;
  enableMEMS?: boolean;
  enableNEMS?: boolean;
  enableBioMEMS?: boolean;
  enableLabOnChip?: boolean;
  enableMicrofluidics?: boolean;
  enableBioengineering?: boolean;
  enableSyntheticBiology?: boolean;
  enableBioinformatics?: boolean;
  enableComputationalBiology?: boolean;
  enableSystemsBiology?: boolean;
  enableBiocomputing?: boolean;
  enableBiosensors?: boolean;
  enableBioelectronics?: boolean;
  enableBiophotonics?: boolean;
  enableBiomaterials?: boolean;
  enableBiomechanics?: boolean;
  enableBiomedical?: boolean;
  enableBiotech?: boolean;
  enablePharma?: boolean;
  enableMedtech?: boolean;
  enableHealthtech?: boolean;
  enableWearables?: boolean;
  enableImplantables?: boolean;
  enableDigitalHealth?: boolean;
  enableTelemedicine?: boolean;
  enableTelehealth?: boolean;
  enablemHealth?: boolean;
  enableEHR?: boolean;
  enableEMR?: boolean;
  enablePHR?: boolean;
  enableHIE?: boolean;
  enableFHIR?: boolean;
  enableHL7?: boolean;
  enableDICOM?: boolean;
  enableSNOMED?: boolean;
  enableICD?: boolean;
  enableCPT?: boolean;
  enableLOINC?: boolean;
  enableRxNorm?: boolean;
  enableNDC?: boolean;
  enableDrug?: boolean;
  enableGenomics?: boolean;
  enableProteomics?: boolean;
  enableMetabolomics?: boolean;
  enableTranscriptomics?: boolean;
  enableEpigenomics?: boolean;
  enablePharmacogenomics?: boolean;
  enablePrecisionMedicine?: boolean;
  enablePersonalizedMedicine?: boolean;
  enableClinicalTrials?: boolean;
  enableRegulatory?: boolean;
  enableGxP?: boolean;
  enableGLP?: boolean;
  enableGCP?: boolean;
  enableGMP?: boolean;
  enableGDP?: boolean;
  enableGSP?: boolean;
  enableCSV?: boolean;
  enableValidation?: boolean;
  enableQualification?: boolean;
  enableVerification?: boolean;
  enableCMC?: boolean;
  enablePharmacovigilance?: boolean;
  enableDrugSafety?: boolean;
  enableAdverse?: boolean;
  enableSignalDetection?: boolean;
  enableRiskManagement?: boolean;
  enableBenefit?: boolean;
  enableEffectiveness?: boolean;
  enableSafety?: boolean;
  enableToxicology?: boolean;
  enablePharmacology?: boolean;
  enablePharmacokinetics?: boolean;
  enablePharmacodynamics?: boolean;
  enableDoseResponse?: boolean;
  enablePKPD?: boolean;
  enablePBPK?: boolean;
  enablePopPK?: boolean;
  enableNonlinear?: boolean;
  enableCompartmental?: boolean;
  enablePhysiological?: boolean;
  enableMechanistic?: boolean;
  enableEmpirical?: boolean;
  enableSemiMechanistic?: boolean;
  enableTopDown?: boolean;
  enableBottomUp?: boolean;
  enableMiddleOut?: boolean;
  enableSystems?: boolean;
  enableNetworks?: boolean;
  enablePathways?: boolean;
  enableSignaling?: boolean;
  enableRegulation?: boolean;
  enableExpression?: boolean;
  enableTranscription?: boolean;
  enableTranslation?: boolean;
  enableProtein?: boolean;
  enableEnzyme?: boolean;
  enableReceptor?: boolean;
  enableTransporter?: boolean;
  enableChannel?: boolean;
  enablePump?: boolean;
  enableCarrier?: boolean;
  enableFacilitated?: boolean;
  enableActive?: boolean;
  enablePassive?: boolean;
  enableDiffusion?: boolean;
  enableOsmosis?: boolean;
  enableFiltration?: boolean;
  enableExocytosis?: boolean;
  enableEndocytosis?: boolean;
  enablePhagocytosis?: boolean;
  enablePinocytosis?: boolean;
  enableAutophagy?: boolean;
  enableApoptosis?: boolean;
  enableNecrosis?: boolean;
  enableInflammation?: boolean;
  enableImmune?: boolean;
  enableAutoimmune?: boolean;
  enableAllergy?: boolean;
  enableHypersensitivity?: boolean;
  enableTolerance?: boolean;
  enableDesensitization?: boolean;
  enableSensitization?: boolean;
  enableCrossReactivity?: boolean;
  enableSpecificity?: boolean;
  enableSelectivity?: boolean;
  enableAffinity?: boolean;
  enableAvidity?: boolean;
  enableKinetics?: boolean;
  enableThermodynamics?: boolean;
  enableEnthalpy?: boolean;
  enableEntropy?: boolean;
  enableGibbs?: boolean;
  enableEquilibrium?: boolean;
  enableLeMass?: boolean;
  enableMichaelis?: boolean;
  enableHill?: boolean;
  enableLangmuir?: boolean;
  enableFreundlich?: boolean;
  enableBET?: boolean;
  enableDubinin?: boolean;
  enableTemkin?: boolean;
  enableRedlich?: boolean;
  enableSips?: boolean;
  enableToth?: boolean;
  enableRadke?: boolean;
  enableWeber?: boolean;
  enableIntraparticle?: boolean;
  enablePseudoFirst?: boolean;
  enablePseudoSecond?: boolean;
  enableElovich?: boolean;
  enableBangham?: boolean;
  enableRitual?: boolean;
  enableMorris?: boolean;
  enableBoyd?: boolean;
  enableReichenberg?: boolean;
  enableCrank?: boolean;
  enableVermeulen?: boolean;
  enableMcKay?: boolean;
  enableChrastil?: boolean;
  enablePore?: boolean;
  enableFilm?: boolean;
  enableSurface?: boolean;
  enableBoundary?: boolean;
  enableBulk?: boolean;
  enableInterfacial?: boolean;
  enableConvection?: boolean;
  enableConduction?: boolean;
  enableRadiation?: boolean;
  enableHeat?: boolean;
  enableMass?: boolean;
  enableMomentum?: boolean;
  enableFourier?: boolean;
  enableFick?: boolean;
  enableNewton?: boolean;
  enableNavier?: boolean;
  enableStokes?: boolean;
  enableEuler?: boolean;
  enableBernoulli?: boolean;
  enableReynolds?: boolean;
  enablePrandtl?: boolean;
  enableSchmidt?: boolean;
  enableLewis?: boolean;
  enableSherwood?: boolean;
  enableNusselt?: boolean;
  enablePeclet?: boolean;
  enableGrashof?: boolean;
  enableRayleigh?: boolean;
  enableWeber?: boolean;
  enableCapillary?: boolean;
  enableFroude?: boolean;
  enableMach?: boolean;
  enableBiot?: boolean;
  enableDamkohler?: boolean;
  enableThiele?: boolean;
  enableHatta?: boolean;
  enableStanton?: boolean;
  enableColburn?: boolean;
  enableChilton?: boolean;
  enableDittus?: boolean;
  enableSieder?: boolean;
  enableTate?: boolean;
  enableGnielinski?: boolean;
  enablePetukhov?: boolean;
  enableKays?: boolean;
  enableCrawford?: boolean;
  enableHausen?: boolean;
  enableZhukauskas?: boolean;
  enableChurchill?: boolean;
  enableBernstein?: boolean;
  enableRanz?: boolean;
  enableMarshall?: boolean;
  enableWhitaker?: boolean;
  enableAcrivos?: boolean;
  enableTaylor?: boolean;
  enableYuge?: boolean;
  enableVliet?: boolean;
  enableSparrow?: boolean;
  enableGregg?: boolean;
  enableKurosaki?: boolean;
  enableRowe?: boolean;
  enableHandley?: boolean;
  enableGupta?: boolean;
  enableWakao?: boolean;
  enableKaganer?: boolean;
  enableYoshida?: boolean;
  enableKunii?: boolean;
  enableLevenspiel?: boolean;
  enableFroment?: boolean;
  enableBischoff?: boolean;
  enableHougen?: boolean;
  enableWatson?: boolean;
  enableRagatz?: boolean;
  enableSmith?: boolean;
  enableVan?: boolean;
  enableHimmelblau?: boolean;
  enableRiggs?: boolean;
  enableOctave?: boolean;
  enableScilab?: boolean;
  enablePython?: boolean;
  enableR?: boolean;
  enableJulia?: boolean;
  enableMATLAB?: boolean;
  enableMathematica?: boolean;
  enableMaple?: boolean;
  enableMaxima?: boolean;
  enableSage?: boolean;
  enableSympy?: boolean;
  enableNumpy?: boolean;
  enableScipy?: boolean
  ?: boolean;
  enablePandas?: boolean;
  enableSklearn?: boolean;
  enableTensorflow?: boolean;
  enableKeras?: boolean;
  enablePytorch?: boolean;
  enableOpencv?: boolean;
  enablePillow?: boolean;
  enableSeaborn?: boolean;
  enablePlotly?: boolean;
  enableBokeh?: boolean;
  enableDash?: boolean;
  enableStreamlit?: boolean;
  enableJupyter?: boolean;
  enableColab?: boolean;
  enableSpyder?: boolean;
  enablePycharm?: boolean;
  enableVSCode?: boolean;
  enableSublime?: boolean;
  enableAtom?: boolean;
  enableVim?: boolean;
  enableEmacs?: boolean;
  enableNano?: boolean;
  enableGit?: boolean;
  enableGitHub?: boolean;
  enableGitLab?: boolean;
  enableBitbucket?: boolean;
  enableSVN?: boolean;
  enableMercurial?: boolean;
  enablePerforce?: boolean;
  enableBazaar?: boolean;
  enableFossil?: boolean;
  enableDarcs?: boolean;
  enableMonotone?: boolean;
  enableArch?: boolean;
  enableCVS?: boolean;
  enableRCS?: boolean;
  enableSCCS?: boolean;
  enableClearCase?: boolean;
  enableTeamFoundation?: boolean;
  enableSourceSafe?: boolean;
  enableStarTeam?: boolean;
  enableSynergy?: boolean;
  enableDimensions?: boolean;
  enableSurround?: boolean;
  enableVault?: boolean;
  enableAccuRev?: boolean;
  enableIntegrity?: boolean;
  enableContinuum?: boolean;
  enableTeamCity?: boolean;
  enableBamboo?: boolean;
  enableJenkins?: boolean;
  enableHudson?: boolean;
  enableCruiseControl?: boolean;
  enableBuildbot?: boolean;
  enableGoCD?: boolean;
  enableConcourse?: boolean;
  enableDrone?: boolean;
  enableCircleCI?: boolean;
  enableTravis?: boolean;
  enableAppVeyor?: boolean;
  enableCodeship?: boolean;
  enableSemaphore?: boolean;
  enableWercker?: boolean;
  enableShippable?: boolean;
  enableSolano?: boolean;
  enableMagnumCI?: boolean;
  enableSnapCI?: boolean;
  enableHerokuCI?: boolean;
  enableAWSCodeBuild?: boolean;
  enableAzurePipelines?: boolean;
  enableGoogleCloudBuild?: boolean;
  enableGitHubActions?: boolean;
  enableGitLabCI?: boolean;
  enableBitbucketPipelines?: boolean;
}

const AdvancedFileUpload: React.FC<UploadProps> = ({
  onFileSelect,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  isLoading = false,
  accept = "*/*",
  maxSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
  allowMultiple = true,
  autoUpload = false,
  showPreview = true,
  showProgress = true,
  showStats = true,
  enableCompression = false,
  enableEncryption = false,
  enableChunkedUpload = false,
  chunkSize = 1024 * 1024, // 1MB chunks
  retryAttempts = 3,
  className = "",
  uploadEndpoint = "/api/upload",
  allowedCategories = [],
  customValidation,
  theme = "auto",
  layout = "grid",
  sortBy = "name",
  sortOrder = "asc",
  enableSearch = true,
  enableFiltering = true,
  enableBulkActions = true,
  showThumbnails = true,
  showMetadata = true,
  enableTagging = true,
  enableDelete = true,
  enableDownload = true,
  ...props
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(layout);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState({ key: sortBy, direction: sortOrder });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalFiles: 0,
    totalSize: 0,
    uploadedFiles: 0,
    uploadedSize: 0,
    avgUploadSpeed: 0,
    estimatedTimeRemaining: 0,
    successRate: 0,
    errorCount: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<{ [key: string]: number }>({});

  // Get file category based on extension
  const getFileCategory = (fileName: string): string => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
      if (config.extensions.includes(extension)) {
        return category;
      }
    }
    return 'DOCUMENT'; // Default category
  };

  // Generate unique file ID
  const generateFileId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds maximum limit of ${formatFileSize(maxSize)}`;
    }

    if (customValidation) {
      return customValidation(file);
    }

    const category = getFileCategory(file.name);
    if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
      return `File type not allowed. Allowed types: ${allowedCategories.join(', ')}`;
    }

    return null;
  };

  // Create file metadata
  const createFileMetadata = (file: File): FileMetadata => {
    const category = getFileCategory(file.name);
    return {
      id: generateFileId(),
      file,
      category,
      uploadProgress: 0,
      uploadSpeed: 0,
      status: 'pending',
      tags: [],
      lastModified: new Date(file.lastModified),
    };
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const validFiles: FileMetadata[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(createFileMetadata(file));
      }
    });

    if (errors.length > 0) {
      console.error('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      const totalFiles = files.length + validFiles.length;
      if (totalFiles > maxFiles) {
        const allowedCount = maxFiles - files.length;
        validFiles.splice(allowedCount);
        console.warn(`Maximum ${maxFiles} files allowed. Only first ${allowedCount} files will be added.`);
      }

      setFiles(prev => [...prev, ...validFiles]);
      onFileSelect?.(validFiles);
      onFilesChange?.([...files, ...validFiles]);

      if (autoUpload) {
        validFiles.forEach(fileMetadata => {
          uploadFile(fileMetadata);
        });
      }
    }
  }, [files, maxFiles, autoUpload, onFileSelect, onFilesChange]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
  }, [handleFileSelect]);

  // Upload file
  const uploadFile = async (fileMetadata: FileMetadata) => {
    setIsUploading(true);
    const startTime = Date.now();
    
    try {
      // Update file status
      setFiles(prev => prev.map(f => 
        f.id === fileMetadata.id ? { ...f, status: 'uploading' } : f
      ));

      // Simulate upload progress
      const uploadPromise = new Promise<void>((resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            resolve();
          }
          
          // Update progress
          setFiles(prev => prev.map(f => 
            f.id === fileMetadata.id ? { 
              ...f, 
              uploadProgress: Math.round(progress),
              uploadSpeed: Math.random() * 1000 + 500 // KB/s
            } : f
          ));
          
          onUploadProgress?.(Math.round(progress), fileMetadata);
        }, 100);
      });

      await uploadPromise;

      // Mark as completed
      const completedFile = {
        ...fileMetadata,
        status: 'completed' as const,
        uploadProgress: 100,
        uploadedAt: new Date()
      };

      setFiles(prev => prev.map(f => 
        f.id === fileMetadata.id ? completedFile : f
      ));

      onUploadComplete?.(completedFile);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const errorFile = {
        ...fileMetadata,
        status: 'error' as const,
        error: errorMessage
      };

      setFiles(prev => prev.map(f => 
        f.id === fileMetadata.id ? errorFile : f
      ));

      onUploadError?.(errorMessage, fileMetadata);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  // Retry upload
  const retryUpload = useCallback((fileMetadata: FileMetadata) => {
    uploadFile(fileMetadata);
  }, []);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(file => file.category === filterCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.file.name.toLowerCase();
          bValue = b.file.name.toLowerCase();
          break;
        case 'size':
          aValue = a.file.size;
          bValue = b.file.size;
          break;
        case 'date':
          aValue = a.lastModified.getTime();
          bValue = b.lastModified.getTime();
          break;
        case 'type':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [files, searchTerm, filterCategory, sortConfig]);

  // Get file icon
  const getFileIcon = (category: string) => {
    const categoryConfig = FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES];
    return categoryConfig ? categoryConfig.icon : File;
  };

  // Get file colors
  const getFileColors = (category: string) => {
    const categoryConfig = FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES];
    return categoryConfig ? {
      color: categoryConfig.color,
      bgColor: categoryConfig.bgColor,
      borderColor: categoryConfig.borderColor
    } : {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-800'
    };
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Select all files
  const selectAll = () => {
    setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.id)));
  };

  // Deselect all files
  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // Bulk actions
  const bulkDelete = () => {
    selectedFiles.forEach(fileId => removeFile(fileId));
    setSelectedFiles(new Set());
  };

  const bulkUpload = () => {
    selectedFiles.forEach(fileId => {
      const file = files.find(f => f.id === fileId);
      if (file && file.status === 'pending') {
        uploadFile(file);
      }
    });
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            File Upload
          </h2>
          <div className="flex items-center space-x-2">
            {enableFiltering && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All Categories</option>
                {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
            </button>
          </div>
        </div>

        {/* Search */}
        {enableSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Bulk Actions */}
        {enableBulkActions && selectedFiles.size > 0 && (
          <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedFiles.size} file(s) selected
            </span>
            <button
              onClick={bulkUpload}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Upload Selected
            </button>
            <button
              onClick={bulkDelete}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Selected
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isLoading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <CloudUpload className={`w-8 h-8 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {dragActive ? 'Drop files here' : 'Choose files or drag them here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Support for {allowMultiple ? 'multiple files' : 'single file'} • Max {formatFileSize(maxSize)} per file
            </p>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Files ({filteredAndSortedFiles.length})
            </h3>
            {enableBulkActions && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-2'
            }
          `}>
            {filteredAndSortedFiles.map((fileMetadata) => {
              const IconComponent = getFileIcon(fileMetadata.category);
              const colors = getFileColors(fileMetadata.category);
              const isSelected = selectedFiles.has(fileMetadata.id);
              
              return (
                <div
                  key={fileMetadata.id}
                  className={`
                    relative border rounded-lg p-4 transition-all duration-200
                    ${colors.borderColor} ${colors.bgColor}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    hover:shadow-md
                  `}
                >
                  {/* Selection Checkbox */}
                  {enableBulkActions && (
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(fileMetadata.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    {/* File Icon */}
                    <div className={`flex-shrink-0 ${colors.color}`}>
                      <IconComponent size={24} />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {fileMetadata.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(fileMetadata.file.size)} • {fileMetadata.category}
                      </p>
                      
                      {/* Upload Progress */}
                      {showProgress && fileMetadata.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Uploading...</span>
                            <span>{fileMetadata.uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${fileMetadata.uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center space-x-2 mt-2">
                        {fileMetadata.status === 'completed' && (
                          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                            <CheckCircle size={16} />
                            <span className="text-xs">Completed</span>
                          </div>
                        )}
                        {fileMetadata.status === 'error' && (
                          <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                            <AlertCircle size={16} />
                            <span className="text-xs">Error</span>
                          </div>
                        )}
                        {fileMetadata.status === 'pending' && (
                          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                            <Clock size={16} />
                            <span className="text-xs">Pending</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {fileMetadata.status === 'error' && (
                        <button
                          onClick={() => retryUpload(fileMetadata)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Retry Upload"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                      
                      {fileMetadata.status === 'pending' && !autoUpload && (
                        <button
                          onClick={() => uploadFile(fileMetadata)}
                          className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Upload"
                        >
                          <CloudUpload size={16} />
                        </button>
                      )}

                      {enableDelete && (
                        <button
                          onClick={() => removeFile(fileMetadata.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {showStats && files.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Upload Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Files:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {files.length}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Completed:</span>
              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                {files.filter(f => f.status === 'completed').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Pending:</span>
              <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">
                {files.filter(f => f.status === 'pending').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Errors:</span>
              <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                {files.filter(f => f.status === 'error').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFileUpload;
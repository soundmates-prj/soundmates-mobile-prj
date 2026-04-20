import { StyleSheet } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';

// ──────────────────────────────────────────────────────────────
// Dynamic stylesheet factory — call with the current palette
// so all theme-sensitive colors update when the user switches.
// ──────────────────────────────────────────────────────────────
type Palette = typeof SoundMateLightColors | typeof SoundMateColors;

export function createProfileStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 100,
    },

    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      height: 60,
      backgroundColor: 'transparent',
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white',
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },

    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    profileCardContainer: {
      marginHorizontal: 0,
      marginTop: 0,
      marginBottom: 20,
    },

    profileCard: {
      backgroundColor: palette.surface,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      overflow: 'hidden',
      position: 'relative',
    },

    profileCoverContainer: {
      height: 220,
      backgroundColor: palette.border,
    },

    coverPressable: {
      flex: 1,
    },

    profileCoverImage: {
      width: '100%',
      height: '100%',
    },

    profileCoverFallback: {
      flex: 1,
    },

    decorCircle: {
      position: 'absolute',
      borderRadius: 9999,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },

    decorCircle1: {
      width: 100,
      height: 100,
      top: -20,
      right: -20,
    },

    decorCircle2: {
      width: 80,
      height: 80,
      bottom: -30,
      left: -10,
    },

    profileInfo: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 10,
      marginTop: -50,
      position: 'relative',
      zIndex: 10,
    },

    avatarContainer: {
      position: 'relative',
    },

    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      borderWidth: 4,
      borderColor: palette.surface,
      backgroundColor: palette.border,
    },

    onlineIndicator: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#10B981',
      borderWidth: 2,
      borderColor: palette.surface,
    },

    profileDetails: {
      marginLeft: 14,
      flex: 1,
      paddingBottom: 2,
    },

    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 3,
    },

    profileName: {
      fontSize: 21,
      fontWeight: 'bold',
      color: palette.textPrimary,
    },

    premiumBadge: {
      backgroundColor: palette.primary + '22',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },

    premiumBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: palette.primary,
    },

    profileUsername: {
      fontSize: 14,
      color: palette.textSecondary,
      marginBottom: 2,
    },

    profileMetaSection: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      marginTop: 4,
    },

    profileBio: {
      fontSize: 13,
      color: palette.textPrimary,
      lineHeight: 20,
    },

    joinedDateRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    joinedDateText: {
      fontSize: 12,
      color: palette.textSecondary,
    },

    popupOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      zIndex: 60,
    },

    popupCard: {
      width: '100%',
      backgroundColor: palette.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },

    popupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },

    popupTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.textPrimary,
    },

    popupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },

    popupOptionText: {
      fontSize: 14,
      color: palette.textPrimary,
    },

    popupOptionDangerText: {
      color: '#EF4444',
      fontWeight: '600',
    },

    imageViewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },

    imageViewerCard: {
      width: '100%',
      height: '72%',
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#0F172A',
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.35)',
    },

    imageViewerHeader: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(148, 163, 184, 0.25)',
    },

    imageViewerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: 'white',
    },

    imageViewerImage: {
      flex: 1,
      width: '100%',
    },

    profileStats: {
      backgroundColor: palette.surface,
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
      paddingVertical: 14,
    },

    profileStatItem: {
      alignItems: 'center',
    },

    profileStatValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: palette.textPrimary,
    },

    profileStatLabel: {
      fontSize: 12,
      color: palette.textSecondary,
    },

    tabsContainer: {
      flexDirection: 'row',
      marginHorizontal: 5,
      marginBottom: 20,
      backgroundColor: palette.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 4,
    },

    tabButton: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
    },

    tabButtonIcon: {
      marginTop: 1,
    },

    tabButtonActive: {
      backgroundColor: palette.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },

    tabButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textSecondary,
    },

    tabButtonTextActive: {
      color: 'white',
    },

    playlistSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },

    playlistSheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    playlistSheetKeyboardWrap: {
      justifyContent: 'flex-end',
    },

    playlistSheetCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      maxHeight: '96%',
      overflow: 'hidden',
    },

    playlistSheetHandle: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },

    playlistSheetHandleBar: {
      width: 46,
      height: 4,
      borderRadius: 999,
    },

    playlistSheetScroll: {
      flexGrow: 0,
    },

    playlistSheetScrollContent: {
      paddingBottom: 16,
    },

    playlistEditorBody: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    playlistEditorLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
    },

    playlistEditorSectionGap: {
      marginTop: 10,
    },

    playlistEditorInput: {
      borderWidth: 1,
      borderRadius: 12,
      minHeight: 44,
      paddingHorizontal: 12,
    },

    playlistEditorInputMultiline: {
      alignItems: 'flex-start',
      minHeight: 88,
      paddingTop: 10,
    },

    playlistEditorInputText: {
      fontSize: 14,
      paddingVertical: 10,
    },

    playlistEditorInputTextMultiline: {
      textAlignVertical: 'top',
      minHeight: 66,
    },

    playlistThumbnailPreview: {
      borderWidth: 1,
      borderRadius: 12,
      height: 156,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    playlistThumbnailImage: {
      width: '100%',
      height: '100%',
    },

    playlistThumbnailEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    playlistThumbnailEmptyText: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
    },

    playlistThumbnailEditBadge: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    playlistThumbnailLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    playlistVisibilityInlineRow: {
      marginTop: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    playlistVisibilityPromptText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
      paddingRight: 10,
    },

    playlistEditorFooter: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      gap: 10,
    },

    playlistEditorFooterButton: {
      flex: 1,
      borderRadius: 12,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },

    playlistEditorCancelButton: {
      borderWidth: 1,
    },

    playlistEditorSaveButton: {
      borderWidth: 0,
    },

    playlistEditorCancelText: {
      fontSize: 14,
      fontWeight: '700',
    },

    playlistEditorSaveText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    settingsBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },

    settingsBackdropTouchable: {
      flex: 1,
    },

    settingsDrawer: {
      backgroundColor: palette.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },

    settingsHandle: {
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
    },

    settingsHandleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: palette.border,
    },

    settingsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },

    settingsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: palette.textPrimary,
    },

    settingsCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    settingsSection: {
      paddingVertical: 12,
    },

    settingsSectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: 20,
      marginBottom: 8,
    },

    settingsMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },

    settingsMenuIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    settingsMenuLabel: {
      flex: 1,
      fontSize: 15,
      color: palette.textPrimary,
    },

    settingsMenuSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginRight: 8,
    },

    settingsMenuBadge: {
      backgroundColor: '#A78BFA',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 8,
    },

    settingsMenuBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: 'white',
    },

    settingsLogoutContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },

    settingsLogoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EF4444',
    },

    settingsLogoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#EF4444',
    },

    settingsVersion: {
      textAlign: 'center',
      fontSize: 12,
      color: palette.textMuted,
      paddingBottom: 24,
    },

    uploadBlockingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },

    uploadBlockingCard: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: palette.surface,
      borderRadius: 18,
      paddingHorizontal: 20,
      paddingVertical: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
      elevation: 10,
    },

    uploadBlockingText: {
      marginTop: 14,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },

    uploadBlockingHint: {
      marginTop: 6,
      fontSize: 13,
      textAlign: 'center',
    },

    bottomSpacer: {
      height: 20,
    },
  });
}

// Keep a backwards-compatible default export (light theme) so that
// any file still importing "styles" without the factory won't break.
const styles = createProfileStyles(SoundMateLightColors);
export default styles;

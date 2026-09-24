import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { CallInfoState } from '../components/call/FloatingCallBar';
import { StudyCallRoomHandle } from '../components/call/StudyCallRoom';

export interface RoomCallContextType {
  callInfo: CallInfoState;
  callRoomRef: React.RefObject<StudyCallRoomHandle | null>;
  isCallActive: boolean;
  setIsCallActive: (active: boolean) => void;
  setCallInfo: React.Dispatch<React.SetStateAction<CallInfoState>>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  leaveCall: () => void;
  joinCall: () => void;
  returnToCall: () => void;
}

export const RoomCallContext = createContext<RoomCallContextType | null>(null);

interface RoomCallProviderProps {
  children: React.ReactNode;
  onNavigateToCall?: () => void;
  onLeaveCallCallback?: () => void;
}

export const RoomCallProvider: React.FC<RoomCallProviderProps> = ({
  children,
  onNavigateToCall,
  onLeaveCallCallback,
}) => {
  const callRoomRef = useRef<StudyCallRoomHandle | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfoState>({
    inCall: false,
    isMicEnabled: true,
    isCamEnabled: true,
    isScreenSharing: false,
    participantCount: 0,
    activeSpeaker: null,
    participantNames: [],
  });

  const toggleMic = useCallback(() => {
    callRoomRef.current?.toggleMic();
  }, []);

  const toggleCam = useCallback(() => {
    callRoomRef.current?.toggleCam();
  }, []);

  const toggleScreenShare = useCallback(() => {
    callRoomRef.current?.toggleScreenShare();
  }, []);

  const leaveCall = useCallback(() => {
    callRoomRef.current?.leaveCall();
    setIsCallActive(false);
    setCallInfo({
      inCall: false,
      isMicEnabled: true,
      isCamEnabled: true,
      isScreenSharing: false,
      participantCount: 0,
      activeSpeaker: null,
      participantNames: [],
    });
    onLeaveCallCallback?.();
  }, [onLeaveCallCallback]);

  const joinCall = useCallback(() => {
    callRoomRef.current?.joinCall();
  }, []);

  const returnToCall = useCallback(() => {
    onNavigateToCall?.();
  }, [onNavigateToCall]);

  return (
    <RoomCallContext.Provider
      value={{
        callInfo,
        callRoomRef,
        isCallActive,
        setIsCallActive,
        setCallInfo,
        toggleMic,
        toggleCam,
        toggleScreenShare,
        leaveCall,
        joinCall,
        returnToCall,
      }}
    >
      {children}
    </RoomCallContext.Provider>
  );
};

export const useRoomCall = () => {
  const context = useContext(RoomCallContext);
  if (!context) {
    throw new Error('useRoomCall must be used within a RoomCallProvider');
  }
  return context;
};

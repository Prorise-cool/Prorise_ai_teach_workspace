/**
 * 文件说明：封装浏览器原生语音识别输入。
 * 负责检测支持情况、切换录音状态，并把识别结果回写给页面容器。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useFeedback } from '@/shared/feedback/feedback-context';

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = ArrayLike<BrowserSpeechRecognitionAlternative>;

type BrowserSpeechRecognitionResultList = ArrayLike<BrowserSpeechRecognitionResult>;

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

/**
 * 使用浏览器原生语音识别能力。
 *
 * @param onResultWrapper - 识别到文本后的回调。
 * @returns 语音输入的支持状态、录音状态与切换方法。
 */
export function useBrowserAsr(onResultWrapper?: (text: string) => void) {
  const { notify } = useFeedback();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const onResultRef = useRef(onResultWrapper);
  const speechRecognitionCtor =
    typeof window === 'undefined'
      ? null
      : window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

  useEffect(() => {
    onResultRef.current = onResultWrapper;
  }, [onResultWrapper]);

  useEffect(() => {
    if (!speechRecognitionCtor) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new speechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = (event) => {
      let currentTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        currentTranscript += event.results[index]?.[0]?.transcript ?? '';
      }

      setTranscript(currentTranscript);
      onResultRef.current?.(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      notify({
        title: '语音识别出错',
        description: '麦克风调用失败或浏览器不支持。',
        tone: 'error'
      });
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [notify, speechRecognitionCtor]);

  const toggleRecording = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      notify({
        title: '不支持语音输入',
        description: '您的浏览器版本过低，不支持原生的语音输入功能。',
        tone: 'error'
      });
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognition.start();
      setIsRecording(true);
    }
  }, [isRecording, notify]);

  return {
    isSupported: speechRecognitionCtor !== null,
    isRecording,
    transcript,
    toggleRecording
  };
}

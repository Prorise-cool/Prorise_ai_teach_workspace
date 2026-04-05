import { useCallback, useEffect, useRef, useState } from 'react';

import { useFeedback } from '@/shared/feedback/feedback-context';

export function useBrowserAsr(onResultWrapper?: (text: string) => void) {
  const { notify } = useFeedback();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // We could use configuration logic for language later, defaulting to zh-CN
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        onResultWrapper?.(currentTranscript);
      };

      recognition.onerror = (event: any) => {
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
    }
  }, [notify, onResultWrapper]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      notify({
        title: '不支持语音输入',
        description: '您的浏览器版本过低，不支持原生的语音输入功能。',
        tone: 'error'
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording, notify]);

  return {
    isSupported: !!recognitionRef.current,
    isRecording,
    transcript,
    toggleRecording
  };
}

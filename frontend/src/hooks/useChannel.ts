import { useEffect, useRef } from "react";
import { pusher } from "../lib/pusher";

export function useChannel(channelName: string, event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!channelName || !event) {
      return;
    }

    const channel = pusher.subscribe(channelName);

    const handler = (data: any) => {
      callbackRef.current(data);
    };

    channel.bind(event, handler);

    return () => {
      channel.unbind(event, handler);
      pusher.unsubscribe(channelName);
    };
  }, [channelName, event]);
}



import React, { useEffect } from "react";
import { ToastType } from "@humansignal/ui";

const StatusChecker = ({ job_id }) => {
  const toast = window.globalToast;

  const playNotificationSound = () => {
    const audio = new Audio('http://localhost:8080/static/sounds/notif_sound.mp3');
    audio.play().catch(err => console.warn('Could not play notification sound:', err));
  };

  const checkStatus = async (id) => {
    const response = await window.globalAPI.callApi("mlBackendJobStatus", {
      params: {
        job_id: id
      }
    });

    if (!response || response.$meta.status !== 200) {
      toast.show({ message: "There was an error checking training status", type: "error", duration: -1 });
      return true;
    }
    
    const { job_status } = response;
    if (job_status === "finished") {
      toast.show({ message: "Training completed successfully", type: "success", duration: -1 });
      return true;
    } else if (job_status === "failed") {
      toast.show({ message: "Training failed. Please check the backend logs.", type: "error", duration: -1 });
      return true;
    } else if (job_status === "started") {
      toast.show({ message: "Training is in progress...", type: "info", duration: 2500 });
      return false;
    } else if (job_status === "queued") {
      toast.show({ message: "Backend is busy. Training is queued...", type: "info", duration: 2500 });
      return false;
    } else if (job_status === "canceled" || job_status === "stopped") {
      toast.show({ message: "Training failed (was canceled or stopped on the backend).", type: "error", duration: -1 });
      return true;
    }
  };

  useEffect(() => {
    let trainingStatusUpdater = setInterval(async () => {
      let status = await checkStatus(job_id);
      if (status) {
        playNotificationSound();
        clearInterval(trainingStatusUpdater);
      }
    }, 5000);
    return () => clearInterval(trainingStatusUpdater);
  }, [job_id]);

  return <></>;
};

export default StatusChecker;

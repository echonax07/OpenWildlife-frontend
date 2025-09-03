import { Menubar } from "../components/Menubar/Menubar";
import { ProjectRoutes } from "../routes/ProjectRoutes";
import { useOrgValidation } from "../hooks/useOrgValidation";
import { useToast } from "@humansignal/ui";
import { useAPI } from "../providers/ApiProvider";

export const RootPage = ({ content }) => {
  window.globalToast = useToast(); // Expose useToast globally
  window.globalAPI = useAPI();
  useOrgValidation();
  const pinned = localStorage.getItem("sidebar-pinned") === "true";
  const opened = pinned && localStorage.getItem("sidebar-opened") === "true";

  return (
    <Menubar
      enabled={true}
      defaultOpened={opened}
      defaultPinned={pinned}
      onSidebarToggle={(visible) => localStorage.setItem("sidebar-opened", visible)}
      onSidebarPin={(pinned) => localStorage.setItem("sidebar-pinned", pinned)}
    >
      <ProjectRoutes content={content} />
    </Menubar>
  );
};

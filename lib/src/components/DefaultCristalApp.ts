/**
 * See the LICENSE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 * This file is part of the Cristal Wiki software prototype
 * @copyright  Copyright (c) 2023 XWiki SAS
 * @license    http://opensource.org/licenses/AGPL-3.0 AGPL-3.0
 *
 **/

import type { Container } from "inversify";
import { inject, injectable, multiInject } from "inversify";
import "reflect-metadata";

import type {
  CristalApp,
  LoggerConfig,
  PageData,
  WikiConfig,
} from "@cristal/api";
import {
  DefaultLogger,
  DefaultPageData,
  type Logger,
  type SkinManager,
} from "@cristal/api";
import type { App, Component, Ref } from "vue";
import { createApp } from "vue";
import {
  createRouter,
  createWebHashHistory,
  Router,
  RouteRecordRaw,
} from "vue-router";

import "@mdi/font/css/materialdesignicons.css";

// Manuel importing to reduce build size
// import { VApp, VContainer, VRow, VCol, VAvatar } from 'vuetify/components'
// import {} from 'vuetify/directives'
import Index from "../c-index.vue";
import IndexPerf from "../indexPerf.vue";

import type { ExtensionManager } from "@cristal/extension-manager";
import type { UIXTemplateProvider, VueTemplateProvider } from "@cristal/skin";
import type { MenuEntry } from "@cristal/extension-menubuttons";
import type { Renderer } from "@cristal/rendering";

// import i18n from './i18n'

@injectable()
export class DefaultCristalApp implements CristalApp {
  public skinManager: SkinManager;
  public extensionManager: ExtensionManager;
  public app: App;
  public page: PageData;
  public mode: string;
  public currentContentRef: Ref;
  public container: Container;
  public vueTemplateProviders: VueTemplateProvider[];
  public wikiConfig: WikiConfig;
  public router: Router;
  public logger: Logger;
  public isElectron: boolean;
  public availableConfigurations: Map<string, WikiConfig>;

  constructor(
    @inject("ExtensionManager") extensionManager: ExtensionManager,
    @inject("SkinManager") skinManager: SkinManager,
    @multiInject("VueTemplateProvider")
    vueTemplateProviders: VueTemplateProvider[],
    @inject("Logger") logger: Logger,
  ) {
    // this.extensionManager = new DefaultExtensionManager();
    this.availableConfigurations = new Map<string, WikiConfig>();
    this.extensionManager = extensionManager;
    this.skinManager = skinManager;
    this.vueTemplateProviders = vueTemplateProviders;
    this.page = new DefaultPageData();
    this.mode = "view";
    this.logger = logger;
    this.logger.setModule("app.components.DefaultWikiApp");
    this.logger?.debug("Skin manager: ", skinManager);
    this.logger?.debug("Vue template providers: ", vueTemplateProviders);
  }

  setContainer(container: Container): void {
    this.container = container;
  }

  getContainer(): Container {
    return this.container;
  }

  getCurrentPage(): string {
    return this.page.name;
  }

  setCurrentPage(newPage: string, mode: string = "view") {
    this.mode = mode;
    if (this.page.name != newPage) {
      this.page.name = newPage;
      this.logger?.debug("Pushing state in history " + newPage);
      history.pushState(
        { page: newPage },
        newPage,
        "/" + this.wikiConfig.name + "/#/" + newPage + "/" + mode,
      );
      // history.pushState({ page : newPage }, newPage, "#/" + newPage + "/view");
      this.page.source = "";
      this.page.html = "";
      this.loadPage();
    }
  }

  handlePopState(event: PopStateEvent) {
    this.logger?.debug("In handlePopState ", event);
    if (event.state && event.state.page) {
      const pageName = event.state.page;
      if (pageName) {
        this.page.name = pageName;
        this.page.source = "";
        this.page.html = "";
        this.loadPage();
      }
    } else {
      this.logger?.debug("Could not find state or state in page", event);
      const page = this.getPageFromHash(location.hash);
      if (page != null) {
        this.page.name = page;
        this.page.source = "";
        this.page.html = "";
        this.loadPage();
      }
    }
  }

  setWikiConfig(wikiConfig: WikiConfig) {
    this.wikiConfig = wikiConfig;
  }

  getWikiConfig() {
    return this.wikiConfig;
  }

  getSkinManager(): SkinManager {
    return this.skinManager;
  }

  switchConfig(configName: string): void {
    this.logger.debug("Switching config to", configName);
    const wikiConfig = this.availableConfigurations.get(configName);
    if (wikiConfig) {
      this.setWikiConfig(wikiConfig);
      if (wikiConfig.designSystem != "")
        this.skinManager.setDesignSystem(wikiConfig.designSystem);
      if (!this.isElectron) {
        // We want to change the URL is non Electron setup
        window.location.href =
          "/" + configName + "/#/" + wikiConfig.homePage + "/";
      } else {
        // Forcing reloading page in electron setup
        window.localStorage.setItem("currentApp", configName);
        // history.go(0);
      }
    }
  }

  // TODO remplace any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAvailableConfigurations(config: Map<string, any>) {
    console.log(config);
    // TODO remplace any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.forEach((wikiConfigObject: any, key: string) => {
      const configType = wikiConfigObject?.configType;

      if (wikiConfigObject) {
        const wikiConfig = this.container.getNamed<WikiConfig>(
          "WikiConfig",
          configType,
        );
        wikiConfig.setConfigFromObject(wikiConfigObject);
        this.availableConfigurations.set(key, wikiConfig);
      }
    });
  }

  getAvailableConfigurations(): Map<string, WikiConfig> {
    return this.availableConfigurations;
  }

  getLogger(module: string): Logger {
    let logger = this.container.get<Logger>("Logger");
    if (!logger) {
      logger = new DefaultLogger();
    }
    logger.setModule(module);
    return logger;
  }

  getLoggerConfig(): LoggerConfig {
    return this.container.get<LoggerConfig>("LoggerConfig");
  }

  renderContent(
    source: string,
    sourceSyntax: string,
    targetSyntax: string,
    wikiConfig: WikiConfig,
  ): string {
    // Protection from rendering errors
    if (source == undefined) return "";

    this.logger.debug("Loading rendering module");
    try {
      const renderer = this.container.get<Renderer>("Renderer");
      return renderer.convert(source, sourceSyntax, targetSyntax, wikiConfig);
    } catch (e) {
      this.logger.error("Could not find a rendering module");
      return source;
    }
  }

  async preloadConverters() {
    this.logger.debug("Loading rendering module");
    try {
      const renderer = this.container.get<Renderer>("Renderer");
      await renderer.preloadConverters();
    } catch (e) {
      this.logger.error("Could not find a rendering module");
    }
  }

  async loadPage() {
    try {
      this.logger?.debug("Loading page", this.page.name);
      if (this.getWikiConfig().isSupported("jsonld")) {
        const pageContentData =
          await this.getWikiConfig().storage.getPageContent(
            this.page.name,
            "jsonld",
          );
        this.page.document = pageContentData.document;
        this.page.source = pageContentData.document.get("text");
        if (pageContentData.html == "") {
          this.page.html = await this.renderContent(
            this.page.source,
            pageContentData.syntax,
            "html",
            this.getWikiConfig(),
          );
          // Update JSON-LD format also
          this.page.document.set("html", this.page.html);
        } else {
          this.page.html = pageContentData.html;
        }

        const sheet =
          this.page.document && this.page.document.get("sheet") != null
            ? this.page.document.get("sheet")
            : "";
        if (this.currentContentRef != null) {
          console.log("Updating vueJS content field to ", this.page.html);
          this.currentContentRef.value.currentContent = this.page.html;
          this.currentContentRef.value.currentSource = this.page.source;
          this.currentContentRef.value.css = pageContentData.css;
          this.currentContentRef.value.js = pageContentData.js;
          this.currentContentRef.value.document = this.page.document;
          this.currentContentRef.value.sheet = sheet;
          this.currentContentRef.value.withSheet = sheet != "";

          this.logger?.debug("Page content ", this.page.source);
          this.logger?.debug("Page loaded ", this.page.name);
        } else {
          console.error("Could not set content on vue page view component");
        }
      } else {
        const pageContentData =
          await this.getWikiConfig().storage.getPageContent(
            this.page.name,
            "html",
          );
        this.page.source = pageContentData.source;
        this.page.html = pageContentData.html;
        if (pageContentData.html == "") {
          this.page.html = await this.renderContent(
            this.page.source,
            pageContentData.syntax,
            "html",
            this.getWikiConfig(),
          );
          // Update JSON-LD format also
          this.page.document.set("html", this.page.html);
        } else {
          this.page.html = pageContentData.html;
        }
        if (this.currentContentRef != null) {
          this.currentContentRef.value.currentContent = this.page.html;
          this.currentContentRef.value.currentSource = this.page.source;
          this.currentContentRef.value.css = pageContentData.css;
          this.currentContentRef.value.js = pageContentData.js;
          this.currentContentRef.value.document = null;
          this.currentContentRef.value.sheet = "";
          this.currentContentRef.value.withSheet = false;
          this.logger?.debug("Page content ", this.page.html);
          this.logger?.debug("Page loaded ", this.page.name);
        } else {
          console.error("Could not set content on vue page view component");
        }
      }
    } catch (e) {
      console.error("Failed to load page ", this.page.name, e);
    }
  }

  async loadPageFromURL(url: string) {
    this.logger?.debug("Trying to load", url);
    const page = this.getWikiConfig().storage.getPageFromViewURL(url);
    if (page != null) {
      this.logger?.debug("The link is evaluated as being page ", page);
      this.setCurrentPage(page);
    } else {
      this.logger?.debug("The link is evaluated as an external link");
      window.open(url, "_blank");
    }
  }

  getCurrentContent(): string {
    return this.page.html;
  }

  getCurrentSource(): string {
    return this.page.source;
  }

  setContentRef(ref: Ref): void {
    this.currentContentRef = ref;
    this.logger?.debug("Received ref from VUE ", ref);
  }

  getCurrentWiki(): string {
    return this.getWikiConfig().name;
  }

  getApp(): App {
    return this.app;
  }

  getRouter(): Router {
    return this.router;
  }

  getPageFromHash(hash: string): string | null {
    let page = null;
    const i1 = hash.indexOf("/");
    const i2 = hash.indexOf("/", i1 + 1);

    if (i1 > 0) {
      if (i2 == -1) page = hash.substring(i1 + 1);
      else page = hash.substring(i1 + 1, i2);
    }
    this.logger?.debug("Page from hash is : ", page);
    return page;
  }

  getPage(): string {
    let page = this.getPageFromHash(location.hash);
    if (page == null) page = this.wikiConfig.homePage;
    this.logger?.debug("Page is:", page);
    return page;
  }

  async run() {
    this.logger?.debug("Before vue");

    // initializing the page data
    const initialPage = this.getPage();
    this.logger?.debug("Initial page is ", initialPage);

    this.page = new DefaultPageData("_jsonld", initialPage, "initial content");

    let routes = [
      {
        path: "/",
        component: this.skinManager.getTemplate("content"),
      } as RouteRecordRaw,
      {
        path: "/:page/view",
        component: this.skinManager.getTemplate("content"),
      } as RouteRecordRaw,
      {
        path: "/:page/edit",
        component: this.skinManager.getTemplate("edit"),
        name: "edit",
      } as RouteRecordRaw,
      {
        path: "/:page/edittext",
        name: "edittext",
        component: this.skinManager.getTemplate("edit"),
      } as RouteRecordRaw,
      {
        path: "/:page/editxwiki",
        name: "editxwiki",
        component: this.skinManager.getTemplate("edit"),
      } as RouteRecordRaw,
      {
        path: "/:page/editmilkdown",
        name: "editmilkdown",
        component: this.skinManager.getTemplate("edit"),
      } as RouteRecordRaw,
      {
        path: "/:page/editprosemirror",
        name: "editprosemirror",
        component: this.skinManager.getTemplate("edit"),
      } as RouteRecordRaw,
      {
        path: "/xwiki/search",
        component: this.skinManager.getTemplate("search"),
      } as RouteRecordRaw,
      {
        path: "/:page/",
        component: this.skinManager.getTemplate("content"),
      } as RouteRecordRaw,
    ];

    const perfMode = this.wikiConfig.name.startsWith("Perf");
    if (perfMode) {
      routes = [
        {
          path: "/",
          component: this.skinManager.getTemplate("perfX"),
        } as RouteRecordRaw,
        {
          path: "/X",
          component: this.skinManager.getTemplate("perfX"),
        } as RouteRecordRaw,
        {
          path: "/empty",
          component: this.skinManager.getTemplate("perfempty"),
        } as RouteRecordRaw,
        {
          path: "/vuetify",
          component: this.skinManager.getTemplate("perfvuetify"),
        } as RouteRecordRaw,
        {
          path: "/dsfr",
          component: this.skinManager.getTemplate("perfdsfr"),
        } as RouteRecordRaw,
        {
          path: "/sl",
          component: this.skinManager.getTemplate("perfsl"),
        } as RouteRecordRaw,
      ];
    }

    this.router = createRouter({
      // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
      history: createWebHashHistory(), // TODO: we should use createWebHistory when not in electron.
      routes,
    });

    this.app = createApp(perfMode ? IndexPerf : Index).use(this.router);
    this.app.provide("count", 0);
    this.app.provide("skinManager", this.skinManager);
    this.app.provide("cristal", this);

    this.skinManager.loadDesignSystem(this.app, this.container);

    const vueComponents = this.container.getAll<VueTemplateProvider>(
      "VueTemplateProvider",
    );
    for (const vueComponentId in vueComponents) {
      const vueComponent = vueComponents[vueComponentId];
      this.logger?.debug(
        "Found vue component ",
        vueComponent.getVueName(),
        vueComponent,
      );
      if (vueComponent.isGlobal()) {
        this.logger?.debug("Vue component is ", vueComponent.getVueComponent());
        const vueComp = vueComponent.getVueComponent();
        this.app.component(vueComponent.getVueName(), vueComp);
      }
      // registering additional components
      this.logger?.debug(
        "Ready to register components of ",
        vueComponent.getVueName(),
      );
      vueComponent.registerComponents(this.app);
    }

    const uixComponents = this.container.getAll<VueTemplateProvider>(
      "UIXTemplateProvider",
    );
    for (const uixComponentId in uixComponents) {
      const uixComponent = uixComponents[uixComponentId];
      this.logger?.debug(
        "Found vue component ",
        uixComponent.getVueName(),
        uixComponent,
      );
      // registering additional components

      this.logger?.debug(
        "Ready to register components of ",
        uixComponent.getVueName(),
      );
      uixComponent.registerComponents(this.app);
    }

    this.app.mount("#app");

    window.addEventListener("popstate", this.handlePopState.bind(this));

    this.logger?.debug("After vue");
    this.logger?.debug("Replacing state in history " + this.getCurrentPage());
    history.replaceState(
      { page: this.getCurrentPage() },
      "",
      "/" + this.wikiConfig.name + "/#/" + this.getCurrentPage() + "/view",
    );

    // WikiModel ready
    await this.preloadConverters();

    this.loadPage();
  }

  getMenuEntries(): Array<string> {
    const menuEntriesElements = new Array<string>();
    try {
      const menuEntries = this.container.getAll<MenuEntry>("MenuEntry");
      this.logger?.debug("All menu entries", menuEntries);
      for (const i in menuEntries) {
        menuEntriesElements.push(menuEntries[i].getMenuEntry());
      }
    } catch (e) {
      this.logger?.debug("No menu entry could be loaded ", e);
    }
    return menuEntriesElements;
  }

  getUIXTemplates(extensionPoint: string): Array<Component> {
    const uixTemplates = new Array<Component>();
    try {
      this.logger?.debug(
        "Searching for UIX with extension Point",
        extensionPoint,
      );
      const uixComponents =
        this.getContainer().getAllNamed<UIXTemplateProvider>(
          "UIXTemplateProvider",
          extensionPoint,
        );
      this.logger?.debug(
        "All uix components for extension point ",
        extensionPoint,
        uixComponents,
      );
      for (const i in uixComponents) {
        uixTemplates.push(uixComponents[i].getVueComponent());
      }
    } catch (e) {
      if (e.message.indexOf("no matching bindings") == 0)
        this.logger?.debug("No uix entry found", e);
    }
    return uixTemplates;
  }
}

"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/context/UserContext";

type StatCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  highlighted?: boolean;
};

type Birthday = {
  id: number;
  name: string;
  date: string;
  area: string;
  initials: string;
};

type NewsItem = {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  category: string;
  image: string;
};

type RankingItem = {
  id: number;
  name: string;
  initials: string;
  position: number;
  points: number;
  operations: number;
  fulfillment: number;
  value: string;
  movement: "up" | "down" | "same";
};

type TaskItem = {
  id: number;
  title: string;
  client: string;
  date: string;
  priority: "Alta" | "Media" | "Baja";
};

export default function Dashboard() {
  const { user, profile, loading } = useUser();

  const stats: StatCardProps[] = [
    {
      title: "% del cumplimiento del mes",
      value: "74 %",
      detail: "Objetivo mensual alcanzado",
      icon: "🎯",
      trend: "up",
    },
    {
      title: "Colocación de tarjetas",
      value: "32",
      detail: "Meta mensual: 40",
      icon: "💳",
      trend: "up",
    },
    {
      title: "Colocación de préstamos",
      value: "18",
      detail: "Meta mensual: 25",
      icon: "💰",
      trend: "neutral",
    },
    {
      title: "Colocación de servicios de salud",
      value: "24",
      detail: "Meta mensual: 30",
      icon: "🩺",
      trend: "up",
    },
  ];

const birthdays = [
  {
    id: 1,
    name: "Sofía Martínez",
    role: "Ejecutiva Comercial",
    day: "30",
    month: "JUL",
    avatar: "/personas/sofia.jfif",
  },
  {
    id: 2,
    name: "Martín Rodríguez",
    role: "Ejecutivo de Préstamos",
    day: "31",
    month: "JUL",
    avatar: "/personas/martin.jpg",
  },
  {
    id: 3,
    name: "Carolina López",
    role: "Ejecutiva Comercial",
    day: "02",
    month: "AGO",
    avatar: "/personas/carolina.jpg",
  },
  {
    id: 4,
    name: "Diego Sánchez",
    role: "Ejecutivo de Salud",
    day: "03",
    month: "AGO",
    avatar: "/personas/diego.jpg",
  },
  {
    id: 5,
    name: "Lucía Fernández",
    role: "Supervisora Comercial",
    day: "04",
    month: "AGO",
    avatar: "/personas/lucia.jpg",
  },
];

  const news: NewsItem[] = [
    {
      id: 1,
      title: "Nueva campaña comercial de agosto",
      description:
        "Ya se encuentra disponible el material y la segmentación de clientes.",
      content:
        "La nueva campaña comercial incluye beneficios exclusivos para clientes y nuevas oportunidades para la colocación de tarjetas, préstamos y servicios.",
      date: "29 de julio",
      category: "Comercial",
      image: "/noticias/comercializacion.jfif",
    },
    {
      id: 2,
      title: "Actualización del proceso de onboarding",
      description:
        "Se incorporaron nuevas validaciones para el alta de clientes.",
      content:
        "El nuevo proceso de onboarding permitirá realizar un seguimiento más preciso de la documentación, el relevamiento y el avance de cada cliente.",
      date: "28 de julio",
      category: "Procesos",
      image: "/noticias/onboarding.jfif",
    },
    {
      id: 3,
      title: "Capacitación sobre seguimiento de oportunidades",
      description:
        "La capacitación se realizará el próximo viernes a las 10:00.",
      content:
        "Durante la capacitación se presentarán buenas prácticas para mejorar el seguimiento comercial y aumentar la conversión de oportunidades.",
      date: "26 de julio",
      category: "Capacitación",
      image: "/noticias/capacitacion.jfif",
    },
    {
      id: 4,
      title: "Reconocimiento a los mejores resultados del mes",
      description:
        "Conocé a los integrantes que lideraron los indicadores comerciales.",
      content:
        "El equipo comercial alcanzó importantes resultados durante el mes, con un crecimiento destacado en la colocación de productos y servicios.",
      date: "24 de julio",
      category: "Institucional",
      image: "/noticias/reconocimiento.jfif",
    },
  ];

  const ranking: RankingItem[] = [
    {
      id: 1,
      name: "Lucía Fernández",
      initials: "LF",
      position: 1,
      points: 42,
      operations: 18,
      fulfillment: 112,
      value: "$ 78.500.000",
      movement: "same",
    },
    {
      id: 2,
      name: "Martín Rodríguez",
      initials: "MR",
      position: 2,
      points: 36,
      operations: 15,
      fulfillment: 97,
      value: "$ 64.200.000",
      movement: "up",
    },
    {
      id: 3,
      name: "Sofía Martínez",
      initials: "SM",
      position: 3,
      points: 32,
      operations: 14,
      fulfillment: 91,
      value: "$ 59.800.000",
      movement: "down",
    },
    {
      id: 4,
      name: "Diego Sánchez",
      initials: "DS",
      position: 4,
      points: 27,
      operations: 12,
      fulfillment: 83,
      value: "$ 51.400.000",
      movement: "up",
    },
    {
      id: 5,
      name: "Carolina López",
      initials: "CL",
      position: 5,
      points: 24,
      operations: 11,
      fulfillment: 76,
      value: "$ 47.100.000",
      movement: "same",
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: 1,
      title: "Contactar por documentación pendiente",
      client: "Distribuidora Central",
      date: "Hoy, 16:30",
      priority: "Alta",
    },
    {
      id: 2,
      title: "Realizar seguimiento de propuesta",
      client: "Comercial del Sur",
      date: "Mañana, 10:00",
      priority: "Media",
    },
    {
      id: 3,
      title: "Actualizar relevamiento comercial",
      client: "Grupo Horizonte",
      date: "1 de agosto",
      priority: "Baja",
    },
  ];


  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [isNewsPaused, setIsNewsPaused] = useState(false);

  useEffect(() => {
    if (isNewsPaused || news.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveNewsIndex((currentIndex) => {
        return currentIndex === news.length - 1
          ? 0
          : currentIndex + 1;
      });
    }, 6000);

    return () => window.clearInterval(interval);
  }, [isNewsPaused, news.length]);

  useEffect(() => {
    if (!isNewsPaused) return;

    const timeout = window.setTimeout(() => {
      setIsNewsPaused(false);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [isNewsPaused]);

  const activeNews = news[activeNewsIndex];

  const secondaryNews = news.filter(
    (_, index) => index !== activeNewsIndex
  );

  function selectNews(index: number) {
    setActiveNewsIndex(index);
    setIsNewsPaused(true);

    window.setTimeout(() => {
      setIsNewsPaused(false);
    }, 10000);
  }

  function goToPreviousNews() {
    setActiveNewsIndex((currentIndex) =>
      currentIndex === 0
        ? news.length - 1
        : currentIndex - 1
    );

    setIsNewsPaused(true);

    window.setTimeout(() => {
      setIsNewsPaused(false);
    }, 10000);
  }

  function goToNextNews() {
    setActiveNewsIndex((currentIndex) =>
      currentIndex === news.length - 1
        ? 0
        : currentIndex + 1
    );

    setIsNewsPaused(true);

    window.setTimeout(() => {
      setIsNewsPaused(false);
    }, 10000);
  }

  if (loading) {
    return (
      <main style={styles.loadingContainer}>
        <div style={styles.loader} />
        <p style={styles.loadingText}>Cargando panel principal...</p>
      </main>
    );
  }

  const displayName =
    profile?.full_name ||
    profile?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const role = profile?.role || "Usuario";

  return (
    <main style={styles.page}>
      {/* ENCABEZADO */}

      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Panel principal</p>

          <h1 style={styles.mainTitle}>Hola, {displayName} 👋</h1>

          <p style={styles.subtitle}>
            Este es el resumen de la actividad del CRM para hoy.
          </p>
        </div>

        <div style={styles.userBadge}>
          <div style={styles.userAvatar}>
            {getInitials(displayName)}
          </div>

          <div>
            <strong style={styles.userName}>{displayName}</strong>
            <span style={styles.userRole}>{role}</span>
          </div>
        </div>
      </section>

      {/* ALERTA PRINCIPAL */}

      <section style={styles.alertBanner}>
        <div style={styles.alertIcon}>⚠️</div>

        <div style={{ flex: 1 }}>
          <strong style={styles.alertTitle}>
            Tenés 3 tareas que vencen hoy
          </strong>

          <p style={styles.alertText}>
            Revisá tus actividades pendientes para evitar demoras en el
            seguimiento de clientes.
          </p>
        </div>

        <button
          type="button"
          style={styles.alertButton}
          onClick={() => console.log("Ver tareas")}
        >
          Ver tareas
        </button>
      </section>

      {/* INDICADORES */}

{/* CÓMO VIENE TU MES */}

<section style={styles.monthPerformanceSection}>
  <div style={styles.monthPerformanceHeader}>
    <div style={styles.monthPerformanceTitleContainer}>
      <div style={styles.monthPerformanceIcon}>
        📊
      </div>

      <div>
        <p style={styles.monthPerformanceEyebrow}>
          Resumen comercial
        </p>

        <h2 style={styles.monthPerformanceTitle}>
          Cómo viene tu mes
        </h2>

        <p style={styles.monthPerformanceDescription}>
          Seguí tus principales objetivos y colocaciones.
        </p>
      </div>
    </div>

    <div style={styles.monthPerformancePeriod}>
      <span style={styles.monthPerformancePeriodLabel}>
        Período
      </span>

      <strong style={styles.monthPerformancePeriodValue}>
        {new Intl.DateTimeFormat("es-AR", {
          month: "long",
          year: "numeric",
        }).format(new Date())}
      </strong>
    </div>
  </div>

  <div style={styles.monthPerformanceGrid}>
    {stats.map((stat, index) => {
      const progress =
        index === 0
          ? 74
          : index === 1
            ? 80
            : index === 2
              ? 72
              : 80;

      return (
        <article
          key={stat.title}
          style={{
            ...styles.monthPerformanceCard,
            ...(index === 0
              ? styles.monthPerformanceCardHighlighted
              : {}),
          }}
        >
          {index === 0 && (
            <div style={styles.monthPerformanceFeaturedLabel}>
              🎯 Objetivo principal
            </div>
          )}

          <div style={styles.monthPerformanceCardHeader}>
            <div
              style={{
                ...styles.monthPerformanceCardIcon,
                ...(index === 0
                  ? styles.monthPerformanceCardIconHighlighted
                  : {}),
              }}
            >
              {stat.icon}
            </div>

            <div
              style={{
                ...styles.monthPerformanceTrend,
                ...(stat.trend === "up"
                  ? styles.monthPerformanceTrendUp
                  : {}),
                ...(stat.trend === "neutral"
                  ? styles.monthPerformanceTrendNeutral
                  : {}),
              }}
            >
              {stat.trend === "up" ? "↗ Creciendo" : "→ Estable"}
            </div>
          </div>

          <div style={styles.monthPerformanceCardContent}>
            <span style={styles.monthPerformanceCardTitle}>
              {stat.title}
            </span>

            <strong
              style={{
                ...styles.monthPerformanceValue,
                ...(index === 0
                  ? styles.monthPerformanceValueHighlighted
                  : {}),
              }}
            >
              {stat.value}
            </strong>

            <span style={styles.monthPerformanceDetail}>
              {stat.detail}
            </span>
          </div>

          <div style={styles.monthPerformanceProgressSection}>
            <div style={styles.monthPerformanceProgressLabels}>
              <span>Avance</span>
              <strong>{progress}%</strong>
            </div>

            <div style={styles.monthPerformanceProgressBackground}>
              <div
                style={{
                  ...styles.monthPerformanceProgressBar,
                  width: `${progress}%`,
                  ...(index === 0
                    ? styles.monthPerformanceProgressBarHighlighted
                    : {}),
                }}
              />
            </div>
          </div>

          <div style={styles.monthPerformanceFooter}>
            {progress >= 80
              ? "Muy cerca del objetivo"
              : progress >= 70
                ? "Buen ritmo comercial"
                : "Necesita seguimiento"}
          </div>
        </article>
      );
    })}
  </div>
</section>

      {/* ACCIONES RÁPIDAS */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Acciones rápidas</h2>
            <p style={styles.sectionDescription}>
              Accesos directos a las funciones más utilizadas.
            </p>
          </div>
        </div>

        <div style={styles.quickActionsGrid}>
          <QuickAction
            icon="➕"
            title="Nuevo cliente"
            description="Registrar un cliente"
            onClick={() => {
              window.location.href = "/clientes/nuevo";
            }}
          />

          <QuickAction
            icon="🔎"
            title="Buscar cliente"
            description="Consultar información"
            onClick={() => {
              window.location.href = "/clientes";
            }}
          />

          <QuickAction
            icon="📋"
            title="Nuevo relevamiento"
            description="Iniciar un relevamiento"
            onClick={() => console.log("Nuevo relevamiento")}
          />

          <QuickAction
            icon="📊"
            title="Ver reportes"
            description="Consultar indicadores"
            onClick={() => console.log("Ver reportes")}
          />
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}

      <div style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          {/* TAREAS */}

          {/* NOTICIAS */}

          <section style={styles.newsCard}>
            <div style={styles.newsPortalHeader}>
              <div>
                <p style={styles.newsPortalEyebrow}>
                  EAYA informa
                </p>

                <h2 style={styles.newsPortalTitle}>
                  Noticias y novedades
                </h2>

                <p style={styles.newsPortalSubtitle}>
                  Todo lo que está pasando en nuestra organización.
                </p>
              </div>

              <div style={styles.newsPortalLive}>
                <span style={styles.newsPortalLiveDot} />
                Actualizado
              </div>
            </div>

            {/* NOTICIA PRINCIPAL */}

            <article
              style={styles.featuredNews}
              onMouseEnter={() => setIsNewsPaused(true)}
              onMouseLeave={() => setIsNewsPaused(false)}
            >
              <img
                key={activeNews.image}
                src={activeNews.image}
                alt={activeNews.title}
                style={styles.featuredNewsImage}
              />

              <div style={styles.featuredNewsOverlay} />

              <div style={styles.featuredNewsContent}>
                <div style={styles.featuredNewsMeta}>
                  <span style={styles.featuredNewsCategory}>
                    {activeNews.category}
                  </span>

                  <span style={styles.featuredNewsDate}>
                    {activeNews.date}
                  </span>
                </div>

                <h3 style={styles.featuredNewsTitle}>
                  {activeNews.title}
                </h3>

                <p style={styles.featuredNewsDescription}>
                  {activeNews.content}
                </p>

                <button
                  type="button"
                  style={styles.featuredNewsButton}
                  onClick={() => {
                    console.log("Abrir noticia", activeNews.id);
                  }}
                >
                  Leer noticia
                  <span>→</span>
                </button>
              </div>

              {/* FLECHAS */}

              <button
                type="button"
                aria-label="Noticia anterior"
                style={{
                  ...styles.newsArrowButton,
                  ...styles.newsArrowLeft,
                }}
                onClick={goToPreviousNews}
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Siguiente noticia"
                style={{
                  ...styles.newsArrowButton,
                  ...styles.newsArrowRight,
                }}
                onClick={goToNextNews}
              >
                ›
              </button>

              {/* INDICADORES */}

              <div style={styles.newsIndicators}>
                {news.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Mostrar noticia ${index + 1}`}
                    onClick={() => selectNews(index)}
                    style={{
                      ...styles.newsIndicator,
                      ...(index === activeNewsIndex
                        ? styles.newsIndicatorActive
                        : {}),
                    }}
                  />
                ))}
              </div>
            </article>

            {/* NOTICIAS SECUNDARIAS */}

            <div style={styles.secondaryNewsContainer}>
              <div style={styles.secondaryNewsHeader}>
                <strong style={styles.secondaryNewsTitle}>
                  Más novedades
                </strong>

                <span style={styles.secondaryNewsCount}>
                  {secondaryNews.length} noticias
                </span>
              </div>

              <div style={styles.secondaryNewsGrid}>
                {secondaryNews.map((item, secondaryIndex) => {
                  const originalIndex = news.findIndex(
                    (newsItem) => newsItem.id === item.id
                  );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      style={styles.newsPortalSecondaryItem}
                      onClick={() => selectNews(originalIndex)}
                    >
                      <div style={styles.newsPortalNumber}>
                        {String(secondaryIndex + 1).padStart(2, "0")}
                      </div>

                      <img
                        src={item.image}
                        alt={item.title}
                        style={styles.newsPortalSecondaryImage}
                      />

                      <div style={styles.newsPortalSecondaryContent}>
                        <div style={styles.secondaryNewsMeta}>
                          <span style={styles.secondaryNewsCategory}>
                            {item.category}
                          </span>

                          <span style={styles.secondaryNewsDate}>
                            {item.date}
                          </span>
                        </div>

                        <h3 style={styles.newsPortalSecondaryTitle}>
                          {item.title}
                        </h3>

                        <p style={styles.newsPortalSecondaryDescription}>
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* NOTICIAS */}

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Noticias y novedades</h2>
                <p style={styles.cardSubtitle}>
                  Comunicaciones internas de la organización.
                </p>
              </div>

              <button type="button" style={styles.linkButton}>
                Ver todas
              </button>
            </div>

            <div style={styles.newsList}>
              {news.map((item) => (
                <article key={item.id} style={styles.newsItem}>
                  <div style={styles.newsIcon}>📰</div>

                  <div style={{ flex: 1 }}>
                    <div style={styles.newsTopRow}>
                      <span style={styles.categoryBadge}>
                        {item.category}
                      </span>

                      <span style={styles.newsDate}>{item.date}</span>
                    </div>

                    <h3 style={styles.newsTitle}>{item.title}</h3>

                    <p style={styles.newsDescription}>
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ACTIVIDAD RECIENTE */}

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Actividad reciente</h2>
                <p style={styles.cardSubtitle}>
                  Últimos movimientos registrados en el CRM.
                </p>
              </div>
            </div>

            <div style={styles.timeline}>
              <TimelineItem
                icon="👤"
                title="Se creó un nuevo cliente"
                description="Empresa del Centro fue incorporada por Laura Gómez."
                time="Hace 15 minutos"
              />

              <TimelineItem
                icon="📄"
                title="Se completó un relevamiento"
                description="Se actualizó la información de Comercial Norte."
                time="Hace 1 hora"
              />

              <TimelineItem
                icon="✅"
                title="Oportunidad convertida"
                description="La oportunidad de Grupo Delta fue marcada como ganada."
                time="Hace 3 horas"
              />

              <TimelineItem
                icon="📞"
                title="Seguimiento registrado"
                description="Se agregó una llamada con Distribuidora Central."
                time="Hace 5 horas"
              />
            </div>
          </section>
        </div>

        <aside style={styles.rightColumn}>
          {/* CUMPLEAÑOS */}

          {/* CUMPLEAÑOS */}

          <section style={styles.birthdayCard}>
            {/* DECORACIONES */}

            <div style={styles.birthdayConfetti}>
              <span style={{ ...styles.confettiPiece, top: "22px", left: "22px" }}>
                ◆
              </span>

              <span style={{ ...styles.confettiPiece, top: "55px", right: "35px" }}>
                ●
              </span>

              <span style={{ ...styles.confettiPiece, top: "105px", left: "42px" }}>
                ★
              </span>

              <span style={{ ...styles.confettiPiece, top: "70px", right: "65px" }}>
                ◆
              </span>
            </div>

            {/* CABECERA */}

            <div style={styles.birthdayHeader}>
              <div style={styles.birthdayHeaderTop}>
                <div style={styles.birthdayTitleContainer}>
                  <div style={styles.birthdayIcon}>
                    🎂
                  </div>

                  <div>
                    <p style={styles.birthdayEyebrow}>
                      Celebramos juntos
                    </p>

                    <h2 style={styles.birthdayTitle}>
                      Cumpleaños
                    </h2>
                  </div>
                </div>

                <div style={styles.birthdayBalloons}>
                  <span style={styles.birthdayBalloonBlue}>●</span>
                  <span style={styles.birthdayBalloonGold}>●</span>
                  <span style={styles.birthdayBalloonLight}>●</span>
                </div>
              </div>

              <div style={styles.birthdayMessage}>
                <div style={styles.birthdayCupcake}>
                  🧁
                </div>

                <div>
                  <strong style={styles.birthdayMessageTitle}>
                    ¡Feliz cumpleaños!
                  </strong>

                  <p style={styles.birthdayMessageText}>
                    Que tengas un día lleno de buenos momentos.
                  </p>
                </div>
              </div>
            </div>

            {/* LISTADO */}

            <div style={styles.birthdayList}>
              {birthdays.map((birthday, index) => (
                <div
                  key={birthday.id ?? `${birthday.name}-${index}`}
                  style={{
                    ...styles.birthdayPerson,
                    ...(index === 0
                      ? styles.birthdayPersonHighlighted
                      : {}),
                  }}
                >
                  <div style={styles.birthdayAvatarWrapper}>
                    {birthday.avatar ? (
                      <img
                        src={birthday.avatar}
                        alt={birthday.name}
                        style={styles.birthdayAvatarImage}
                      />
                    ) : (
                      <div style={styles.birthdayAvatarFallback}>
                        {birthday.name
                          .split(" ")
                          .map((word: string) => word[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}

                    {index === 0 && (
                      <span style={styles.birthdayMiniCake}>
                        🎂
                      </span>
                    )}
                  </div>

                  <div style={styles.birthdayPersonInformation}>
                    <div style={styles.birthdayNameRow}>
                      <strong style={styles.birthdayPersonName}>
                        {birthday.name}
                      </strong>

                      {index === 0 && (
                        <span style={styles.birthdayTodayBadge}>
                          Próximo
                        </span>
                      )}
                    </div>

                    <span style={styles.birthdayPersonRole}>
                      {birthday.role}
                    </span>
                  </div>

                  <div
                    style={{
                      ...styles.birthdayDate,
                      ...(index === 0
                        ? styles.birthdayDateHighlighted
                        : {}),
                    }}
                  >
                    <strong style={styles.birthdayDay}>
                      {birthday.day}
                    </strong>

                    <span style={styles.birthdayMonth}>
                      {birthday.month}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* PIE */}

            <div style={styles.birthdayFooter}>
              <div style={styles.birthdayFooterMessage}>
                <span>🎉</span>

                <span>
                  No te olvides de saludar a tus compañeros
                </span>
              </div>

              <button
                type="button"
                style={styles.birthdayButton}
                onClick={() => console.log("Ver cumpleaños")}
              >
                Ver todos
              </button>
            </div>
          </section>

          {/* RANKING */}

          {/* RANKING MUNDIAL */}

          <section style={styles.worldCupRanking}>
            {/* CABECERA */}

            <div style={styles.worldCupHeader}>
              <div style={styles.worldCupHeaderContent}>
                <div style={styles.worldCupFlag}>
                  <span style={styles.flagBlue} />
                  <span style={styles.flagWhite}>☀️</span>
                  <span style={styles.flagBlue} />
                </div>

                <div>
                  <p style={styles.worldCupEyebrow}>
                    Mundial comercial
                  </p>

                  <h2 style={styles.worldCupTitle}>
                    Tabla de posiciones
                  </h2>

                  <p style={styles.worldCupSubtitle}>
                    Ranking del equipo durante el mes
                  </p>
                </div>
              </div>

              <div style={styles.worldCupStars}>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>
            </div>

            {/* INFORMACIÓN DEL TORNEO */}

            <div style={styles.tournamentInformation}>
              <div>
                <span style={styles.tournamentLabel}>Competencia</span>
                <strong style={styles.tournamentValue}>
                  Copa EAYA 2026
                </strong>
              </div>

              <div style={styles.tournamentRound}>
                Fecha 4 de 5
              </div>
            </div>

            {/* ENCABEZADO DE TABLA */}

            <div style={styles.rankingTableHeader}>
              <span style={styles.positionColumn}>POS</span>
              <span style={styles.playerColumn}>EQUIPO</span>
              <span style={styles.statColumn}>PJ</span>
              <span style={styles.statColumn}>CUM.</span>
              <span style={styles.pointsColumn}>PTS</span>
            </div>

            {/* FILAS */}

            <div style={styles.worldCupTable}>
              {ranking.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...styles.worldCupRow,
                    ...(item.position === 1
                      ? styles.worldCupLeaderRow
                      : {}),
                  }}
                >
                  <div style={styles.positionCell}>
                    <span
                      style={{
                        ...styles.worldCupPosition,
                        ...(item.position === 1
                          ? styles.worldCupFirstPosition
                          : {}),
                        ...(item.position === 2
                          ? styles.worldCupSecondPosition
                          : {}),
                        ...(item.position === 3
                          ? styles.worldCupThirdPosition
                          : {}),
                      }}
                    >
                      {item.position}
                    </span>

                    <span
                      style={{
                        ...styles.movementIndicator,
                        ...(item.movement === "up"
                          ? styles.movementUp
                          : {}),
                        ...(item.movement === "down"
                          ? styles.movementDown
                          : {}),
                        ...(item.movement === "same"
                          ? styles.movementSame
                          : {}),
                      }}
                    >
                      {item.movement === "up" && "▲"}
                      {item.movement === "down" && "▼"}
                      {item.movement === "same" && "—"}
                    </span>
                  </div>

                  <div style={styles.worldCupPlayer}>
                    <div
                      style={{
                        ...styles.worldCupAvatar,
                        ...(item.position === 1
                          ? styles.worldCupLeaderAvatar
                          : {}),
                      }}
                    >
                      {item.initials}
                    </div>

                    <div style={styles.worldCupPlayerData}>
                      <div style={styles.worldCupPlayerNameRow}>
                        <strong style={styles.worldCupPlayerName}>
                          {item.name}
                        </strong>

                        {item.position === 1 && (
                          <span style={styles.championBadge}>
                            👑 Líder
                          </span>
                        )}
                      </div>

                      <span style={styles.worldCupPlayerValue}>
                        {item.value}
                      </span>

                      <div style={styles.fulfillmentBarBackground}>
                        <div
                          style={{
                            ...styles.fulfillmentBar,
                            width: `${Math.min(item.fulfillment, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.worldCupStat}>
                    {item.operations}
                  </div>

                  <div style={styles.worldCupStat}>
                    {item.fulfillment} %
                  </div>

                  <div style={styles.worldCupPoints}>
                    {item.points}
                  </div>
                </div>
              ))}
            </div>

            {/* PIE DEL RANKING */}

            <div style={styles.worldCupFooter}>
              <div style={styles.classificationLegend}>
                <span style={styles.classificationDot} />

                <span>
                  Los primeros 3 clasifican al reconocimiento mensual
                </span>
              </div>

              <button
                type="button"
                style={styles.worldCupButton}
                onClick={() => console.log("Ver ranking completo")}
              >
                Ver tabla completa
              </button>
            </div>
          </section>

          {/* OPORTUNIDAD DESTACADA */}

<section style={styles.opportunityCard}>
  <div style={styles.opportunityGlow} />
  <div style={styles.opportunityGlowBottom} />

  <div style={styles.opportunityContent}>
    <div style={styles.opportunityTop}>
      <span style={styles.opportunityLabel}>
        💎 Oportunidad destacada
      </span>

      <span style={styles.opportunityProbability}>
        80%
      </span>
    </div>

    <h2 style={styles.opportunityTitle}>
      Grupo Empresarial Norte
    </h2>

    <p style={styles.opportunityText}>
      La oportunidad se encuentra en etapa de negociación y presenta una alta
      probabilidad de convertirse en una nueva venta durante los próximos días.
    </p>

    <div style={styles.opportunityDivider} />

    <div style={styles.opportunityFooter}>
      <div>
        <span style={styles.opportunityCaption}>
          Valor estimado
        </span>

        <strong style={styles.opportunityValue}>
          $ 42.500
        </strong>
      </div>

      <button
        type="button"
        style={styles.opportunityButton}
        onClick={() => console.log("Abrir oportunidad")}
      >
        Ver oportunidad →
      </button>
    </div>
  </div>
</section>
        </aside>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
  trend = "neutral",
  highlighted = false,
}: StatCardProps) {
  return (
    <article
      style={{
        ...styles.statCard,
        ...(highlighted ? styles.statCardHighlighted : {}),
      }}
    >
      <div style={styles.statTopRow}>
        <div
          style={{
            ...styles.statIcon,
            ...(highlighted ? styles.statIconHighlighted : {}),
          }}
        >
          {icon}
        </div>

        <span
          style={{
            ...styles.trendBadge,
            ...(trend === "up" ? styles.trendUp : {}),
            ...(trend === "down" ? styles.trendDown : {}),
            ...(trend === "neutral" ? styles.trendNeutral : {}),
          }}
        >
          {trend === "up" && "↗"}
          {trend === "down" && "↘"}
          {trend === "neutral" && "—"}
        </span>
      </div>

      <span
        style={{
          ...styles.statTitle,
          ...(highlighted ? styles.statTitleHighlighted : {}),
        }}
      >
        {title}
      </span>

      <strong
        style={{
          ...styles.statValue,
          ...(highlighted ? styles.statValueHighlighted : {}),
        }}
      >
        {value}
      </strong>

      {highlighted && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: value,
              }}
            />
          </div>

          <div style={styles.progressLabels}>
            <span>0 %</span>
            <span>100 %</span>
          </div>
        </div>
      )}

      <span
        style={{
          ...styles.statDetail,
          ...(highlighted ? styles.statDetailHighlighted : {}),
        }}
      >
        {detail}
      </span>
    </article>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" style={styles.quickAction} onClick={onClick}>
      <span style={styles.quickActionIcon}>{icon}</span>

      <span style={styles.quickActionText}>
        <strong style={styles.quickActionTitle}>{title}</strong>
        <span style={styles.quickActionDescription}>{description}</span>
      </span>

      <span style={styles.quickActionArrow}>→</span>
    </button>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  time,
}: {
  icon: string;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div style={styles.timelineItem}>
      <div style={styles.timelineIcon}>{icon}</div>

      <div style={{ flex: 1 }}>
        <strong style={styles.timelineTitle}>{title}</strong>
        <p style={styles.timelineDescription}>{description}</p>
        <span style={styles.timelineTime}>{time}</span>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getPriorityStyle(priority: TaskItem["priority"]) {
  if (priority === "Alta") {
    return {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (priority === "Media") {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  return {
    backgroundColor: "#dcfce7",
    color: "#166534",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    backgroundColor: "#f4f7fb",
    color: "#172033",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loadingContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
  },

  loader: {
    width: "38px",
    height: "38px",
    border: "4px solid #dbe5f1",
    borderTopColor: "#2457d6",
    borderRadius: "50%",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  eyebrow: {
    margin: "0 0 5px",
    color: "#2457d6",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  mainTitle: {
    margin: 0,
    fontSize: "30px",
    lineHeight: 1.2,
    color: "#15213b",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    backgroundColor: "#ffffff",
    border: "1px solid #e4eaf2",
    borderRadius: "14px",
    boxShadow: "0 5px 16px rgba(15, 23, 42, 0.05)",
  },

  userAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "#2457d6",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  userName: {
    display: "block",
    fontSize: "14px",
  },

  userRole: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "capitalize",
  },

  alertBanner: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "22px",
    padding: "15px 18px",
    border: "1px solid #fed7aa",
    backgroundColor: "#fff7ed",
    borderRadius: "14px",
  },

  alertIcon: {
    fontSize: "23px",
  },

  alertTitle: {
    display: "block",
    color: "#9a3412",
    fontSize: "14px",
  },

  alertText: {
    margin: "4px 0 0",
    color: "#c2410c",
    fontSize: "13px",
  },

  alertButton: {
    border: "none",
    borderRadius: "9px",
    padding: "9px 14px",
    backgroundColor: "#ea580c",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },


  statTopRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "14px",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    backgroundColor: "#eef4ff",
    fontSize: "21px",
  },

  trendBadge: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  trendUp: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },

  trendDown: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },

  trendNeutral: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },

  statTitle: {
    display: "block",
    marginBottom: "6px",
    color: "#64748b",
    fontSize: "13px",
  },

  statValue: {
    display: "block",
    marginBottom: "5px",
    color: "#172033",
    fontSize: "27px",
  },

  statDetail: {
    color: "#64748b",
    fontSize: "12px",
  },

  section: {
    marginBottom: "24px",
  },

  sectionHeader: {
    marginBottom: "13px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
  },

  sectionDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "13px",
  },

  quickAction: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    textAlign: "left",
    border: "1px solid #e4eaf2",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },

  quickActionIcon: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    backgroundColor: "#eef4ff",
    fontSize: "19px",
  },

  quickActionText: {
    flex: 1,
  },

  quickActionTitle: {
    display: "block",
    fontSize: "14px",
  },

  quickActionDescription: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "12px",
  },

  quickActionArrow: {
    color: "#2457d6",
    fontSize: "18px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.7fr) minmax(300px, 0.8fr)",
    gap: "20px",
    alignItems: "start",
  },

  leftColumn: {
    display: "grid",
    gap: "20px",
  },

  rightColumn: {
    display: "grid",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e4eaf2",
    borderRadius: "16px",
    padding: "19px",
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.04)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    paddingBottom: "15px",
    borderBottom: "1px solid #edf1f6",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  linkButton: {
    padding: 0,
    border: "none",
    backgroundColor: "transparent",
    color: "#2457d6",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px 0",
    borderBottom: "1px solid #edf1f6",
  },

  taskCheck: {
    width: "30px",
    height: "30px",
    borderRadius: "9px",
    border: "1px solid #d7dfeb",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    display: "block",
    fontSize: "13px",
  },

  taskClient: {
    display: "block",
    marginTop: "4px",
    color: "#64748b",
    fontSize: "12px",
  },

  taskMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "5px",
  },

  priorityBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 800,
  },

  taskDate: {
    color: "#64748b",
    fontSize: "11px",
  },

  newsList: {
    display: "grid",
  },

  newsItem: {
    display: "flex",
    gap: "13px",
    padding: "16px 0",
    borderBottom: "1px solid #edf1f6",
  },

  newsIcon: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    borderRadius: "10px",
    backgroundColor: "#eef4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  newsTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  categoryBadge: {
    color: "#2457d6",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  newsDate: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  newsTitle: {
    margin: "6px 0 4px",
    fontSize: "14px",
  },

  newsDescription: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  timeline: {
    paddingTop: "5px",
  },

  timelineItem: {
    display: "flex",
    gap: "13px",
    padding: "14px 0",
    borderBottom: "1px solid #edf1f6",
  },

  timelineIcon: {
    width: "37px",
    height: "37px",
    flexShrink: 0,
    borderRadius: "50%",
    backgroundColor: "#eef4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  timelineTitle: {
    fontSize: "13px",
  },

  timelineDescription: {
    margin: "4px 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  timelineTime: {
    color: "#94a3b8",
    fontSize: "11px",
  },


  personRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px 0",
    borderBottom: "1px solid #edf1f6",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "#e0eaff",
    color: "#2457d6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 800,
  },

  personName: {
    display: "block",
    fontSize: "13px",
  },

  personArea: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "11px",
  },


  birthdayToday: {
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: 800,
  },

  rankingIcon: {
    fontSize: "21px",
  },

  rankingRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px 0",
    borderBottom: "1px solid #edf1f6",
  },

  rankingPosition: {
    width: "29px",
    height: "29px",
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 800,
  },

  firstPosition: {
    backgroundColor: "#fef3c7",
    color: "#a16207",
  },

  secondPosition: {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  },

  thirdPosition: {
    backgroundColor: "#ffedd5",
    color: "#9a3412",
  },

  rankingName: {
    display: "block",
    fontSize: "12px",
  },

  rankingOperations: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
  },

  rankingValue: {
    color: "#2457d6",
    fontSize: "12px",
  },

  opportunityTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  opportunityFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "21px",
  },


  monthSummarySection: {
    marginBottom: "26px",
    padding: "24px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, #173c91 0%, #2457d6 55%, #3973ef 100%)",
    boxShadow: "0 12px 30px rgba(36, 87, 214, 0.22)",
  },

  monthSummaryHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
  },

  monthSummaryEyebrow: {
    margin: "0 0 5px",
    color: "#bfdbfe",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
  },

  monthSummaryTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "23px",
  },

  monthSummaryDescription: {
    margin: "7px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
  },

  monthSummaryDate: {
    padding: "8px 13px",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "999px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgba(255, 255, 255, 0.7)",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 7px 20px rgba(15, 23, 42, 0.12)",
  },

  statCardHighlighted: {
    backgroundColor: "#ffffff",
    border: "2px solid #93c5fd",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.2)",
  },

  statIconHighlighted: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },

  statTitleHighlighted: {
    color: "#1e3a8a",
    fontWeight: 700,
  },

  statValueHighlighted: {
    color: "#1d4ed8",
    fontSize: "32px",
  },

  statDetailHighlighted: {
    color: "#475569",
    fontWeight: 600,
  },

  progressContainer: {
    margin: "12px 0 10px",
  },

  progressBackground: {
    width: "100%",
    height: "9px",
    overflow: "hidden",
    borderRadius: "999px",
    backgroundColor: "#dbeafe",
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)",
    transition: "width 0.4s ease",
  },

  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "5px",
    color: "#94a3b8",
    fontSize: "9px",
  },

  newsCard: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #e4eaf2",
    borderRadius: "18px",
    padding: "19px",
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.04)",
  },

  featuredNews: {
    position: "relative",
    height: "390px",
    overflow: "hidden",
    marginTop: "18px",
    borderRadius: "16px",
    backgroundColor: "#0f172a",
  },

  featuredNewsImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
    animation: "fadeIn 0.5s ease",
  },

  featuredNewsOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.72) 45%, rgba(15, 23, 42, 0.15) 100%)",
  },

  featuredNewsContent: {
    position: "absolute",
    left: "32px",
    bottom: "45px",
    zIndex: 2,
    width: "min(580px, calc(100% - 64px))",
    color: "#ffffff",
  },

  featuredNewsMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },

  featuredNewsCategory: {
    padding: "5px 10px",
    borderRadius: "999px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  featuredNewsDate: {
    color: "#e2e8f0",
    fontSize: "12px",
  },

  featuredNewsTitle: {
    maxWidth: "570px",
    margin: "0 0 12px",
    color: "#ffffff",
    fontSize: "29px",
    lineHeight: 1.15,
  },

  featuredNewsDescription: {
    maxWidth: "550px",
    margin: "0 0 20px",
    color: "#e2e8f0",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  featuredNewsButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    padding: "10px 15px",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  },

  newsArrowButton: {
    position: "absolute",
    top: "50%",
    zIndex: 3,
    width: "38px",
    height: "38px",
    transform: "translateY(-50%)",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: "50%",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    color: "#ffffff",
    fontSize: "27px",
    lineHeight: 1,
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  },

  newsArrowLeft: {
    left: "14px",
  },

  newsArrowRight: {
    right: "14px",
  },

  newsIndicators: {
    position: "absolute",
    right: "24px",
    bottom: "20px",
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  newsIndicator: {
    width: "8px",
    height: "8px",
    padding: 0,
    border: "none",
    borderRadius: "999px",
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },

  newsIndicatorActive: {
    width: "26px",
    backgroundColor: "#ffffff",
  },

  secondaryNewsContainer: {
    marginTop: "22px",
  },

  secondaryNewsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  secondaryNewsTitle: {
    color: "#172033",
    fontSize: "14px",
  },

  secondaryNewsCount: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  secondaryNewsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "13px",
  },

  secondaryNewsItem: {
    display: "flex",
    minWidth: 0,
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    border: "1px solid #e4eaf2",
    borderRadius: "13px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  secondaryNewsImage: {
    width: "105px",
    minHeight: "115px",
    flexShrink: 0,
    objectFit: "cover",
  },

  secondaryNewsContent: {
    minWidth: 0,
    padding: "12px",
  },

  secondaryNewsMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "7px",
    marginBottom: "7px",
  },

  secondaryNewsCategory: {
    overflow: "hidden",
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 800,
    textOverflow: "ellipsis",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },

  secondaryNewsDate: {
    flexShrink: 0,
    color: "#94a3b8",
    fontSize: "9px",
  },

  secondaryNewsItemTitle: {
    display: "-webkit-box",
    overflow: "hidden",
    margin: "0 0 5px",
    color: "#172033",
    fontSize: "12px",
    lineHeight: 1.35,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },

  secondaryNewsDescription: {
    display: "-webkit-box",
    overflow: "hidden",
    margin: 0,
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.4,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },
  worldCupRanking: {
    overflow: "hidden",
    border: "1px solid #bae6fd",
    borderRadius: "20px",
    backgroundColor: "#ffffff",
    boxShadow: "0 12px 30px rgba(14, 116, 144, 0.12)",
  },

  worldCupHeader: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "120px",
    padding: "22px",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #38bdf8 0%, #e0f2fe 48%, #ffffff 50%, #e0f2fe 52%, #38bdf8 100%)",
  },

  worldCupHeaderContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  worldCupFlag: {
    width: "56px",
    height: "48px",
    overflow: "hidden",
    border: "2px solid rgba(255, 255, 255, 0.9)",
    borderRadius: "8px",
    boxShadow: "0 5px 12px rgba(15, 23, 42, 0.18)",
  },

  flagBlue: {
    display: "block",
    height: "16px",
    backgroundColor: "#74acdf",
  },

  flagWhite: {
    display: "flex",
    height: "16px",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    fontSize: "10px",
  },

  worldCupEyebrow: {
    margin: "0 0 3px",
    color: "#075985",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },

  worldCupTitle: {
    margin: 0,
    color: "#0c4a6e",
    fontSize: "21px",
    fontWeight: 900,
  },

  worldCupSubtitle: {
    margin: "4px 0 0",
    color: "#0369a1",
    fontSize: "11px",
  },

  worldCupStars: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    gap: "4px",
    color: "#f59e0b",
    fontSize: "16px",
    textShadow: "0 2px 4px rgba(15, 23, 42, 0.2)",
  },

  tournamentInformation: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 18px",
    borderBottom: "1px solid #e0f2fe",
    backgroundColor: "#f0f9ff",
  },

  tournamentLabel: {
    display: "block",
    marginBottom: "2px",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  tournamentValue: {
    color: "#0c4a6e",
    fontSize: "12px",
  },

  tournamentRound: {
    padding: "5px 9px",
    borderRadius: "999px",
    backgroundColor: "#0c4a6e",
    color: "#ffffff",
    fontSize: "9px",
    fontWeight: 800,
  },

  rankingTableHeader: {
    display: "grid",
    gridTemplateColumns: "55px minmax(0, 1fr) 40px 55px 42px",
    alignItems: "center",
    padding: "10px 13px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "0.05em",
  },

  positionColumn: {
    textAlign: "center",
  },

  playerColumn: {
    paddingLeft: "5px",
  },

  statColumn: {
    textAlign: "center",
  },

  pointsColumn: {
    textAlign: "center",
  },

  worldCupTable: {
    backgroundColor: "#ffffff",
  },

  worldCupRow: {
    display: "grid",
    gridTemplateColumns: "55px minmax(0, 1fr) 40px 55px 42px",
    minHeight: "76px",
    alignItems: "center",
    padding: "10px 13px",
    borderBottom: "1px solid #edf2f7",
    transition: "background-color 0.2s ease",
  },

  worldCupLeaderRow: {
    background:
      "linear-gradient(90deg, #fffbeb 0%, #ffffff 65%)",
    borderLeft: "4px solid #f59e0b",
    paddingLeft: "9px",
  },

  positionCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },

  worldCupPosition: {
    width: "27px",
    height: "27px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 900,
  },

  worldCupFirstPosition: {
    background:
      "linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)",
    color: "#78350f",
    boxShadow: "0 3px 8px rgba(245, 158, 11, 0.3)",
  },

  worldCupSecondPosition: {
    background:
      "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
    color: "#334155",
  },

  worldCupThirdPosition: {
    background:
      "linear-gradient(135deg, #fed7aa 0%, #c2410c 100%)",
    color: "#ffffff",
  },

  movementIndicator: {
    width: "10px",
    fontSize: "7px",
    fontWeight: 900,
    textAlign: "center",
  },

  movementUp: {
    color: "#16a34a",
  },

  movementDown: {
    color: "#dc2626",
  },

  movementSame: {
    color: "#94a3b8",
  },

  worldCupPlayer: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  worldCupAvatar: {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #bae6fd",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #e0f2fe 0%, #ffffff 100%)",
    color: "#0369a1",
    fontSize: "10px",
    fontWeight: 900,
  },

  worldCupLeaderAvatar: {
    borderColor: "#fbbf24",
    background:
      "linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)",
    color: "#92400e",
  },

  worldCupPlayerData: {
    minWidth: 0,
    flex: 1,
  },

  worldCupPlayerNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  worldCupPlayerName: {
    overflow: "hidden",
    color: "#172033",
    fontSize: "11px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  championBadge: {
    flexShrink: 0,
    padding: "2px 5px",
    borderRadius: "999px",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: "7px",
    fontWeight: 900,
  },

  worldCupPlayerValue: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "8px",
  },

  fulfillmentBarBackground: {
    width: "100%",
    height: "3px",
    overflow: "hidden",
    marginTop: "5px",
    borderRadius: "999px",
    backgroundColor: "#e2e8f0",
  },

  fulfillmentBar: {
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
  },

  worldCupStat: {
    color: "#475569",
    fontSize: "10px",
    fontWeight: 700,
    textAlign: "center",
  },

  worldCupPoints: {
    color: "#0c4a6e",
    fontSize: "15px",
    fontWeight: 900,
    textAlign: "center",
  },

  worldCupFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "14px 17px",
    backgroundColor: "#f0f9ff",
  },

  classificationLegend: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#475569",
    fontSize: "9px",
  },

  classificationDot: {
    width: "7px",
    height: "7px",
    flexShrink: 0,
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
  },

  worldCupButton: {
    flexShrink: 0,
    padding: "7px 10px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#0c4a6e",
    color: "#ffffff",
    fontSize: "9px",
    fontWeight: 800,
    cursor: "pointer",
  },

  newsPortalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    paddingBottom: "16px",
    borderBottom: "3px solid #172033",
  },

  newsPortalEyebrow: {
    margin: "0 0 3px",
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  newsPortalTitle: {
    margin: 0,
    color: "#172033",
    fontSize: "22px",
    fontWeight: 900,
  },

  newsPortalSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  newsPortalLive: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "9px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  newsPortalLiveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.12)",
  },

  newsPortalSecondaryItem: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "34px 105px minmax(0, 1fr)",
    minWidth: 0,
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },

  newsPortalNumber: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#172033",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 900,
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    letterSpacing: "0.1em",
  },

  newsPortalSecondaryImage: {
    width: "105px",
    height: "118px",
    objectFit: "cover",
  },

  newsPortalSecondaryContent: {
    minWidth: 0,
    padding: "12px",
  },

  newsPortalSecondaryTitle: {
    display: "-webkit-box",
    overflow: "hidden",
    margin: "0 0 6px",
    color: "#172033",
    fontSize: "12px",
    fontWeight: 800,
    lineHeight: 1.35,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },

  newsPortalSecondaryDescription: {
    display: "-webkit-box",
    overflow: "hidden",
    margin: 0,
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.4,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },

  birthdayCard: {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #fed7aa",
  borderRadius: "20px",
  background:
    "linear-gradient(180deg, #fffaf3 0%, #ffffff 46%, #fffaf3 100%)",
  boxShadow: "0 12px 30px rgba(180, 83, 9, 0.08)",
},

birthdayConfetti: {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  overflow: "hidden",
  pointerEvents: "none",
},

confettiPiece: {
  position: "absolute",
  color: "#f59e0b",
  fontSize: "8px",
  opacity: 0.45,
},

birthdayHeader: {
  position: "relative",
  zIndex: 1,
  padding: "19px 18px 17px",
  borderBottom: "1px solid #ffedd5",
  background:
    "radial-gradient(circle at top right, rgba(125, 211, 252, 0.3), transparent 38%), linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #eff6ff 100%)",
},

birthdayHeaderTop: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
},

birthdayTitleContainer: {
  display: "flex",
  alignItems: "center",
  gap: "10px",
},

birthdayIcon: {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #fed7aa",
  borderRadius: "13px",
  backgroundColor: "#ffffff",
  fontSize: "21px",
  boxShadow: "0 5px 12px rgba(180, 83, 9, 0.09)",
},

birthdayEyebrow: {
  margin: "0 0 2px",
  color: "#c2410c",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
},

birthdayTitle: {
  margin: 0,
  color: "#172033",
  fontSize: "20px",
  fontWeight: 900,
},

birthdayBalloons: {
  position: "relative",
  width: "60px",
  height: "48px",
},

birthdayBalloonBlue: {
  position: "absolute",
  top: "2px",
  right: "20px",
  color: "#38bdf8",
  fontSize: "39px",
  lineHeight: 1,
  textShadow: "0 5px 8px rgba(14, 116, 144, 0.18)",
},

birthdayBalloonGold: {
  position: "absolute",
  top: "14px",
  right: "0",
  color: "#fbbf24",
  fontSize: "31px",
  lineHeight: 1,
},

birthdayBalloonLight: {
  position: "absolute",
  top: "19px",
  left: "0",
  color: "#bae6fd",
  fontSize: "28px",
  lineHeight: 1,
},

birthdayMessage: {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  marginTop: "16px",
  padding: "13px",
  border: "1px solid rgba(251, 191, 36, 0.3)",
  borderRadius: "15px",
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(254, 243, 199, 0.7))",
  boxShadow: "0 5px 12px rgba(180, 83, 9, 0.05)",
},

birthdayCupcake: {
  flexShrink: 0,
  fontSize: "31px",
},

birthdayMessageTitle: {
  display: "block",
  color: "#0369a1",
  fontSize: "14px",
  fontWeight: 900,
},

birthdayMessageText: {
  margin: "3px 0 0",
  color: "#64748b",
  fontSize: "10px",
  lineHeight: 1.4,
},

birthdayList: {
  position: "relative",
  zIndex: 1,
  padding: "10px 12px",
  backgroundColor: "rgba(255, 255, 255, 0.88)",
},

birthdayPerson: {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "63px",
  padding: "8px",
  borderBottom: "1px solid #f1f5f9",
  borderRadius: "11px",
},

birthdayPersonHighlighted: {
  border: "1px solid #fde68a",
  background:
    "linear-gradient(90deg, #fffbeb 0%, #ffffff 100%)",
  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)",
},

birthdayAvatarWrapper: {
  position: "relative",
  width: "39px",
  height: "39px",
  flexShrink: 0,
},

birthdayAvatarImage: {
  width: "39px",
  height: "39px",
  display: "block",
  objectFit: "cover",
  border: "2px solid #ffffff",
  borderRadius: "50%",
  boxShadow: "0 3px 8px rgba(15, 23, 42, 0.15)",
},

birthdayAvatarFallback: {
  width: "39px",
  height: "39px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #ffffff",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
  color: "#1d4ed8",
  fontSize: "10px",
  fontWeight: 900,
  boxShadow: "0 3px 8px rgba(15, 23, 42, 0.12)",
},

birthdayMiniCake: {
  position: "absolute",
  right: "-5px",
  bottom: "-3px",
  width: "18px",
  height: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #ffffff",
  borderRadius: "50%",
  backgroundColor: "#fef3c7",
  fontSize: "9px",
},

birthdayPersonInformation: {
  minWidth: 0,
  flex: 1,
},

birthdayNameRow: {
  display: "flex",
  alignItems: "center",
  gap: "5px",
},

birthdayPersonName: {
  overflow: "hidden",
  color: "#172033",
  fontSize: "11px",
  fontWeight: 800,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
},

birthdayPersonRole: {
  display: "block",
  overflow: "hidden",
  marginTop: "3px",
  color: "#64748b",
  fontSize: "9px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
},

birthdayTodayBadge: {
  flexShrink: 0,
  padding: "2px 6px",
  borderRadius: "999px",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  fontSize: "7px",
  fontWeight: 900,
  textTransform: "uppercase",
},

birthdayDate: {
  width: "39px",
  minHeight: "43px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #bfdbfe",
  borderRadius: "10px",
  background:
    "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
},

birthdayDateHighlighted: {
  borderColor: "#fbbf24",
  background:
    "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
},

birthdayDay: {
  color: "#172033",
  fontSize: "13px",
  lineHeight: 1,
},

birthdayMonth: {
  marginTop: "3px",
  color: "#475569",
  fontSize: "7px",
  fontWeight: 900,
},

birthdayFooter: {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "13px 15px",
  borderTop: "1px solid #ffedd5",
  backgroundColor: "#fffaf3",
},

birthdayFooterMessage: {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#78716c",
  fontSize: "8px",
},

birthdayButton: {
  flexShrink: 0,
  padding: "7px 11px",
  border: "1px solid #bfdbfe",
  borderRadius: "9px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "9px",
  fontWeight: 800,
  cursor: "pointer",
},

monthPerformanceSection: {
  position: "relative",
  overflow: "hidden",
  padding: "22px",
  border: "1px solid #bfdbfe",
  borderRadius: "20px",
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.5), transparent 30%), linear-gradient(135deg, #1d4ed8 0%, #2563eb 42%, #60a5fa 100%)",
  boxShadow: "0 14px 34px rgba(37, 99, 235, 0.2)",
},

monthPerformanceHeader: {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "19px",
},

monthPerformanceTitleContainer: {
  display: "flex",
  alignItems: "center",
  gap: "12px",
},

monthPerformanceIcon: {
  width: "46px",
  height: "46px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: "14px",
  backgroundColor: "rgba(255,255,255,0.16)",
  fontSize: "22px",
  backdropFilter: "blur(8px)",
},

monthPerformanceEyebrow: {
  margin: "0 0 3px",
  color: "rgba(255,255,255,0.78)",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
},

monthPerformanceTitle: {
  margin: 0,
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 900,
},

monthPerformanceDescription: {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.84)",
  fontSize: "11px",
},

monthPerformancePeriod: {
  flexShrink: 0,
  padding: "8px 12px",
  border: "1px solid rgba(255,255,255,0.38)",
  borderRadius: "12px",
  backgroundColor: "rgba(255,255,255,0.15)",
  color: "#ffffff",
  textAlign: "right",
  backdropFilter: "blur(7px)",
},

monthPerformancePeriodLabel: {
  display: "block",
  marginBottom: "2px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "7px",
  fontWeight: 800,
  textTransform: "uppercase",
},

monthPerformancePeriodValue: {
  display: "block",
  fontSize: "10px",
  textTransform: "capitalize",
},

monthPerformanceGrid: {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "13px",
},

monthPerformanceCard: {
  position: "relative",
  minWidth: 0,
  minHeight: "230px",
  padding: "17px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.82)",
  borderRadius: "16px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,252,0.97))",
  boxShadow: "0 9px 20px rgba(15,23,42,0.12)",
},

monthPerformanceCardHighlighted: {
  border: "2px solid #fbbf24",
  background:
    "linear-gradient(180deg, #fffdf5 0%, #ffffff 100%)",
  boxShadow: "0 11px 24px rgba(245,158,11,0.2)",
},

monthPerformanceFeaturedLabel: {
  position: "absolute",
  top: "10px",
  right: "10px",
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  fontSize: "7px",
  fontWeight: 900,
  textTransform: "uppercase",
},

monthPerformanceCardHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
},

monthPerformanceCardIcon: {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "13px",
  background:
    "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
  fontSize: "20px",
},

monthPerformanceCardIconHighlighted: {
  background:
    "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
},

monthPerformanceTrend: {
  padding: "4px 7px",
  borderRadius: "999px",
  fontSize: "7px",
  fontWeight: 900,
},

monthPerformanceTrendUp: {
  backgroundColor: "#dcfce7",
  color: "#15803d",
},

monthPerformanceTrendNeutral: {
  backgroundColor: "#f1f5f9",
  color: "#64748b",
},

monthPerformanceCardContent: {
  marginTop: "17px",
},

monthPerformanceCardTitle: {
  display: "block",
  minHeight: "30px",
  color: "#475569",
  fontSize: "10px",
  fontWeight: 800,
  lineHeight: 1.4,
},

monthPerformanceValue: {
  display: "block",
  marginTop: "7px",
  color: "#172033",
  fontSize: "29px",
  lineHeight: 1,
},

monthPerformanceValueHighlighted: {
  color: "#b45309",
  fontSize: "32px",
},

monthPerformanceDetail: {
  display: "block",
  marginTop: "7px",
  color: "#64748b",
  fontSize: "9px",
},

monthPerformanceProgressSection: {
  marginTop: "17px",
},

monthPerformanceProgressLabels: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "6px",
  color: "#64748b",
  fontSize: "8px",
},

monthPerformanceProgressBackground: {
  width: "100%",
  height: "7px",
  overflow: "hidden",
  borderRadius: "999px",
  backgroundColor: "#e2e8f0",
},

monthPerformanceProgressBar: {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)",
},

monthPerformanceProgressBarHighlighted: {
  background:
    "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
},

monthPerformanceFooter: {
  marginTop: "13px",
  paddingTop: "10px",
  borderTop: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "8px",
  fontWeight: 700,
  textAlign: "center",
},

opportunityCard: {
  position: "relative",
  overflow: "hidden",
  padding: "28px",
  borderRadius: "22px",
  background: `
    radial-gradient(circle at 85% 20%, rgba(255,255,255,.35) 0%, transparent 28%),
    radial-gradient(circle at 15% 90%, rgba(255,255,255,.18) 0%, transparent 35%),
    linear-gradient(135deg,#1d4ed8 0%,#2563eb 45%,#60a5fa 100%)
  `,
  boxShadow: "0 18px 40px rgba(37,99,235,.25)",
},

opportunityContent: {
  position: "relative",
  zIndex: 2,
},

opportunityGlow: {
  position: "absolute",
  top: "-120px",
  right: "-90px",
  width: "300px",
  height: "300px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(255,255,255,.45) 0%, rgba(255,255,255,.15) 45%, transparent 72%)",
  filter: "blur(12px)",
},

opportunityGlowBottom: {
  position: "absolute",
  bottom: "-160px",
  left: "-120px",
  width: "260px",
  height: "260px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(255,255,255,.18) 0%, transparent 70%)",
  filter: "blur(25px)",
},

opportunityDivider: {
  height: "1px",
  margin: "22px 0",
  background:
    "linear-gradient(to right, rgba(255,255,255,.25), rgba(255,255,255,.65), rgba(255,255,255,.25))",
},

opportunityLabel: {
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,.16)",
  color: "#fff",
  fontSize: "11px",
  fontWeight: 800,
  backdropFilter: "blur(8px)",
},

opportunityProbability: {
  padding: "7px 14px",
  borderRadius: "999px",
  background: "#22c55e",
  color: "#fff",
  fontWeight: 900,
  fontSize: "12px",
},

opportunityTitle: {
  marginTop: "22px",
  marginBottom: "10px",
  color: "#fff",
  fontSize: "32px",
  fontWeight: 900,
},

opportunityText: {
  color: "rgba(255,255,255,.88)",
  lineHeight: 1.7,
  fontSize: "15px",
  maxWidth: "70%",
},

opportunityCaption: {
  color: "rgba(255,255,255,.75)",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: ".08em",
},

opportunityValue: {
  display: "block",
  marginTop: "6px",
  color: "#fff",
  fontSize: "34px",
  fontWeight: 900,
},

};
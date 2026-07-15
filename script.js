/* =============================================
   SOLLO PILATES — JAVASCRIPT
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- SYMPTOM ACCORDION (2ª dobra) ----------
     Todos os cards começam do mesmo tamanho e em P&B.
     - Mouse (hover real): passar por cima expande e colore; tirar o mouse de cima devolve ao
       tamanho normal e P&B — nenhum card fica "aberto" sem o mouse estar em cima.
     - Toque (celular/tablet, sem hover): pressionar e SEGURAR o dedo em cima da foto expande
       e colore; soltar o dedo devolve ao tamanho normal e P&B — mesmo comportamento do hover,
       só que disparado por pointerdown/pointerup em vez de mouseenter/mouseleave. Pedido do
       usuário, 2026-07-10 (antes era um toque simples que deixava o card aberto até o próximo
       toque, sem "soltar para encolher" — trocado por esse gesto de pressionar-e-segurar).
       Usamos Pointer Events com checagem de `pointerType === 'touch'` pra não duplicar/
       conflitar com a lógica de mouse acima (pointerdown/up também disparam para mouse, mas
       ficam de fora por essa checagem).
     - Teclado: foco segue a mesma lógica (expande no foco, volta ao perder o foco), pra manter
       a interação acessível. */
  const symptomAccordion = document.getElementById('symptomAccordion');
  if (symptomAccordion) {
    const symptomCards = Array.from(symptomAccordion.querySelectorAll('.symptom-card'));

    function activateSymptomCard(index) {
      symptomCards[index].classList.add('is-active');
    }

    function deactivateSymptomCard(index) {
      symptomCards[index].classList.remove('is-active');
    }

    symptomCards.forEach((card, i) => {
      card.addEventListener('mouseenter', () => activateSymptomCard(i));
      card.addEventListener('mouseleave', () => deactivateSymptomCard(i));
      card.addEventListener('focus', () => activateSymptomCard(i));
      card.addEventListener('blur', () => deactivateSymptomCard(i));

      card.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') activateSymptomCard(i);
      });
      card.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') deactivateSymptomCard(i);
      });
      card.addEventListener('pointercancel', (e) => {
        if (e.pointerType === 'touch') deactivateSymptomCard(i);
      });
    });
  }

  /* ---------- NAVBAR SCROLL ---------- */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  /* ---------- SMOOTH SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- SCROLL REVEAL ----------
     Removido por completo a pedido do usuário (2026-07-09): o efeito "fade in up"
     (opacity 0->1 + translateY(32px)->0 ao entrar no viewport) não deve mais existir
     em NENHUMA dobra do site. O mecanismo (IntersectionObserver + classe .reveal)
     foi removido daqui e as regras .reveal/.reveal.visible/.reveal-delay-N foram
     removidas do styles.css, e todas as ocorrências da classe "reveal"/"reveal-
     delay-N" foram removidas do index.html — os 3 lugares (HTML, CSS, JS) precisam
     ficar em sincronia; remover só a classe do HTML não bastava (foi o que causou
     o efeito "voltar a funcionar" reportado pelo usuário depois de uma edição
     seguinte reintroduzir a classe em alguns elementos por engano). Removendo o
     mecanismo inteiro, mesmo que a classe "reveal" reapareça em algum elemento no
     futuro (por engano), ela não tem mais nenhum efeito visual. */

  /* ---------- FAQ ACCORDION ---------- */
  const faqItems = document.querySelectorAll('.faq__item');
  const faqList = document.querySelector('.faq__list');

  // Marca o .faq__list como "tem um card aberto" — usado no CSS pra
  // esmaecer os cards fechados quando qualquer um deles está aberto.
  function updateFaqListState() {
    if (!faqList) return;
    const hasOpen = Array.from(faqItems).some(item => item.classList.contains('open'));
    faqList.classList.toggle('has-open', hasOpen);
  }

  faqItems.forEach(item => {
    const question = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(other => {
        other.classList.remove('open');
        other.querySelector('.faq__answer').style.maxHeight = null;
      });

      // Open clicked (if it wasn't already open)
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }

      updateFaqListState();
    });
  });

  // Fecha todos os cards do FAQ ao clicar fora deles
  document.addEventListener('click', (e) => {
    if (e.target.closest('.faq__item')) return;

    faqItems.forEach(item => {
      item.classList.remove('open');
      item.querySelector('.faq__answer').style.maxHeight = null;
    });

    updateFaqListState();
  });

  /* ---------- TESTIMONIALS CAROUSEL ---------- */
  const track = document.getElementById('testimonialTrack');
  if (track) {
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.carousel-arrow--prev');
    const nextBtn = document.querySelector('.carousel-arrow--next');
    const trackContainer = track.parentElement;
    const totalSlides = slides.length;
    let currentIndex = 0; // índice "real" (0..totalSlides-1), usado pelos dots/is-active
    let rawIndex = 0;      // índice "cru", sem wrap — pode passar de totalSlides-1 ou de 0
                            // para permitir que a animação continue sempre na mesma direção

    /* Clona 2 slides de cada ponta (não só 1) para dar sensação de carrossel
       infinito sem "pulos": com apenas 1 clone de cada lado, o vizinho-do-vizinho
       (2 posições de distância) ficava fora do DOM até o instante exato do salto,
       aparecendo de repente sem transição — por isso duplicamos os clones, para
       que esse vizinho mais distante já esteja sempre presente e no lugar certo. */
    const looped = totalSlides > 1;
    const CLONE_COUNT = Math.min(2, Math.max(1, totalSlides - 1));
    let leadingClones = [];  // clones inseridos ANTES do primeiro slide real
    let trailingClones = []; // clones inseridos DEPOIS do último slide real

    if (looped) {
      // depois do último slide real: clones dos primeiros CLONE_COUNT slides, em ordem
      for (let i = 0; i < CLONE_COUNT; i++) {
        const clone = slides[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
        trailingClones.push(clone);
      }
      // antes do primeiro slide real: clones dos últimos CLONE_COUNT slides, em ordem
      for (let i = 0; i < CLONE_COUNT; i++) {
        const realIndex = totalSlides - CLONE_COUNT + i;
        const clone = slides[realIndex].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.insertBefore(clone, slides[0]);
        leadingClones.push(clone);
      }
    }

    /* Centraliza o slide ativo na área visível, com base na largura real
       (calculada em px), para que os vizinhos apareçam parcialmente ao lado.
       Quando "instant" é true, a transição é desativada por um instante para
       reposicionar sem animação (usado no "salto" invisível entre o clone e
       o slide real, no final/começo do loop). */
    // offsetWidth (não getBoundingClientRect) porque não é afetado pelo
    // transform: scale() dos slides não-ativos nem pelo estado da transição —
    // sempre reflete a largura real de layout (368px), não a largura "encolhida"
    // visualmente naquele instante.
    function computeOffset() {
      const slideWidth = slides[0].offsetWidth;
      const containerWidth = trackContainer.getBoundingClientRect().width;
      const domIndex = rawIndex + (looped ? CLONE_COUNT : 0); // deslocado pelos clones inseridos no início
      return (containerWidth - slideWidth) / 2 - domIndex * slideWidth;
    }

    function updateTransform(instant) {
      if (!slides.length) return;
      const offset = computeOffset();

      if (instant) {
        track.style.transition = 'none';
        track.style.transform = `translateX(${offset}px)`;
        void track.offsetHeight; // força reflow antes de reativar a transição
        track.style.transition = '';
      } else {
        track.style.transform = `translateX(${offset}px)`;
      }
    }

    let isAnimating = false; // true enquanto uma transição está em andamento —
                              // bloqueia novos cliques nas setas até ela terminar

    /* direction: +1 (próximo), -1 (anterior) ou undefined (salto direto, ex.: clique num dot) */
    function goToSlide(index, direction) {
      if (isAnimating) return; // ignora cliques extras enquanto a transição atual não termina

      const prevRawIndex = rawIndex;

      if (direction === 1) {
        rawIndex += 1;
      } else if (direction === -1) {
        rawIndex -= 1;
      } else {
        rawIndex = index;
      }

      const changed = rawIndex !== prevRawIndex;

      currentIndex = ((rawIndex % totalSlides) + totalSlides) % totalSlides;

      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === currentIndex);
      });
      // Os clones precisam refletir o mesmo estado do slide real que representam,
      // senão o clone que desliza para o centro durante o "loop" fica sempre
      // pequeno/apagado até o salto final — causando aquele pulo visual brusco.
      if (looped) {
        trailingClones.forEach((clone, i) => {
          clone.classList.toggle('is-active', currentIndex === i);
        });
        leadingClones.forEach((clone, i) => {
          const represents = totalSlides - CLONE_COUNT + i;
          clone.classList.toggle('is-active', currentIndex === represents);
        });
      }
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });

      updateTransform(false);

      // Se o índice não mudou de verdade (ex.: clicou no dot que já estava ativo),
      // não há transição real acontecendo — não trava os cliques nesse caso,
      // senão o carrossel ficaria travado para sempre (transitionend nunca dispararia).
      if (!changed) return;

      // Se passamos para além do clone imediato (início ou fim), deixamos a
      // animação terminar normalmente sobre ele e, assim que acabar, saltamos
      // sem transição para a posição do slide real equivalente — como o
      // clone é idêntico ao slide real, o salto é invisível ao usuário.
      const needsLoopReset = looped && (rawIndex === totalSlides || rawIndex === -1);

      isAnimating = true;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        track.removeEventListener('transitionend', onEnd);
        clearTimeout(fallbackTimer);
        if (needsLoopReset) {
          rawIndex = currentIndex;
          updateTransform(true);
        }
        isAnimating = false;
      };

      const onEnd = (e) => {
        if (e.target === track && e.propertyName === 'transform') finish();
      };
      track.addEventListener('transitionend', onEnd);
      // Rede de segurança: caso o transitionend não dispare por algum motivo
      // (ex.: aba perde o foco durante a transição), libera os cliques de novo
      // mesmo assim, um pouco depois da duração da transição (0.5s).
      const fallbackTimer = setTimeout(finish, 600);
    }

    function nextSlide() { goToSlide(null, 1); }
    function prevSlide() { goToSlide(null, -1); }

    goToSlide(0);
    window.addEventListener('resize', () => updateTransform(true));

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.getAttribute('data-index'));
        goToSlide(index);
      });
    });

    /* ---------- Drag / swipe (mouse + toque, arraste fluido em tempo real) ----------
       Pointer Events tratam mouse e toque com o mesmo código: enquanto o botão/dedo
       estiver pressionado, o carrossel acompanha o movimento pixel a pixel (sem
       transição, graças à classe .dragging). Ao soltar, decide se troca de
       depoimento com base na distância arrastada E na velocidade do gesto — um
       "flick" rápido troca mesmo com pouca distância, igual à maioria dos
       carrosséis modernos (Swiper, carrosséis nativos de app). Sem inércia: se não
       passar do limiar, o carrossel volta suavemente para o depoimento atual.
       Está limitado a trocar no máximo 1 depoimento por arrasto. */
    let isDragging = false;
    let dragPointerId = null;
    let dragStartX = 0;
    let dragStartTime = 0;
    let dragBaseOffset = 0;
    let dragSlideWidth = 0;
    let dragDeltaX = 0;

    const DRAG_DISTANCE_RATIO = 0.35;     // % da largura do slide para trocar por distância
    const DRAG_VELOCITY_THRESHOLD = 0.5;  // px/ms — flick rápido troca mesmo com pouca distância
    const DRAG_RUBBER_BAND = 0.3;         // resistência ao passar de 1 slide de distância

    function applyRubberBand(delta, slideWidth) {
      if (Math.abs(delta) <= slideWidth) return delta;
      const excess = Math.abs(delta) - slideWidth;
      const resisted = slideWidth + excess * DRAG_RUBBER_BAND;
      return delta < 0 ? -resisted : resisted;
    }

    track.addEventListener('pointerdown', (e) => {
      if (isAnimating || (e.pointerType === 'mouse' && e.button !== 0)) return;
      isDragging = true;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartTime = performance.now();
      dragBaseOffset = computeOffset();
      dragSlideWidth = slides[0].offsetWidth;
      dragDeltaX = 0;
      track.classList.add('dragging');
      track.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDragging || e.pointerId !== dragPointerId) return;
      dragDeltaX = applyRubberBand(e.clientX - dragStartX, dragSlideWidth);
      track.style.transform = `translateX(${dragBaseOffset + dragDeltaX}px)`;
    });

    function endDrag(e) {
      if (!isDragging || e.pointerId !== dragPointerId) return;
      isDragging = false;
      track.classList.remove('dragging');

      const elapsed = performance.now() - dragStartTime;
      const velocity = elapsed > 0 ? dragDeltaX / elapsed : 0; // px/ms
      const distanceRatio = Math.abs(dragDeltaX) / dragSlideWidth;
      const shouldChange = distanceRatio > DRAG_DISTANCE_RATIO || Math.abs(velocity) > DRAG_VELOCITY_THRESHOLD;

      if (shouldChange) {
        dragDeltaX < 0 ? nextSlide() : prevSlide();
      } else {
        updateTransform(false); // volta suavemente para o depoimento atual
      }
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    /* Keyboard arrow navigation when focused */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
  }

  /* ---------- SCROLL CARD STACK ----------
   *
   * Animacao guiada pelo scroll em tempo real (sem CSS transition).
   * O translateY de cada card e calculado a cada frame com requestAnimationFrame,
   * entao o movimento acompanha exatamente a velocidade do scroll.
   *
   * Depoimentos NÃO faz mais parte dessa animação (voltou a ser seção normal, ver
   * .testimonials no CSS/HTML) — a pedido do usuário, pra nunca correr o risco de
   * ficar por cima dos cards/título, o que acontecia quando ele subia em sobreposição
   * real por cima do painel travado.
   *
   * MODELO EM CASCATA ("leque"): cada card (1, 2, 3) segue o card anterior a uma
   * distância FIXA (STEP) enquanto não é a sua própria vez de subir. STEP não é
   * 96px puro — é a altura do card + 96px (ver measureCardHeight abaixo), porque o
   * pedido do usuário é 96px entre o FINAL de um card e o COMEÇO do próximo, não
   * 96px entre os topos. Como os cards têm todos a mesma altura, um deslocamento
   * topo-a-topo de (altura + 96px) produz exatamente 96px de vão visível entre o
   * final de um e o começo do outro. Isso significa que quando o card-0 está
   * subindo (da posição centralizada até o topo), os cards 1/2/3 já sobem JUNTO
   * com ele, todos mantendo esse STEP de distância entre si (como um baralho de
   * cartas em leque). Só depois que o card-0 trava no topo é que o card-1 continua
   * subindo sozinho até fechar essa distância (ficar 100% sobreposto ao card-0) —
   * e enquanto isso, os cards 2/3 continuam "colados" a STEP de distância atrás do
   * card-1 (que está se movendo). Quando o card-1 trava, o card-2 fecha sua
   * distância enquanto o card-3 fica colado atrás dele. E assim por diante até o
   * card-3 fechar sozinho no final.
   *
   * Zonas de progress (0-1), calculadas a partir de quantos vh de scroll cada card
   * usa (ver CARD0_VH/CLOSE_VH abaixo). O card-0 usa 20vh (era 40vh — reduzido pela
   * metade a pedido do usuário: ele percorre uma distância pequena, do centro da
   * tela até o topo, então em 40vh de scroll ele "andava" bem menos por vh do que
   * os cards 1-3, que percorrem uma distância bem maior, e por isso parecia mais
   * lento que os outros; com 20vh ele fica mais rápido/próximo da velocidade
   * deles). Os cards 1-3 continuam com 60vh cada (inalterado desde a última
   * mudança). Total: 20 + 60*3 = 200vh de animação (.proof-stats tem
   * 300vh = 100vh visível + 200vh de animação):
   *   card-0: 0    -> 20vh   "Alívio de Dores" sobe da posição centralizada na
   *           tela até 96px do topo (ver centerOffset abaixo). Mais rápido que
   *           antes (era 40vh).
   *   card-1: 20vh -> 80vh   fecha a distância assim que o card-0 trava.
   *   card-2: 80vh -> 140vh  fecha a distância assim que o card-1 trava.
   *   card-3: 140vh -> 200vh "Energia extra" — fecha a distância assim que o
   *           card-2 trava, terminando exatamente nos 200vh (sem pausa extra):
   *           assim que assenta, o scroll-jack libera e a seção de depoimentos
   *           (normal, fora do scroll-jack) aparece em seguida, com 96px de
   *           distância (ver .testimonials no CSS).
   *
   * O título fica travado na posição centralizada até o card-3 começar a fechar
   * sua própria distância, e a partir daí sobe em sincronia exata com ele (mesma
   * fração t, 0 = ainda a STEP de distância, 1 = já fechado/sobreposto), terminando
   * alinhado com o resto do conteúdo bem no instante em que o scroll-jack libera.
   -------------------------------------------------------- */
  function initScrollCards() {
    const section = document.querySelector('.proof-stats');
    if (!section) return;

    const cards = Array.from(section.querySelectorAll('.proof-card--data'));
    const n = cards.length;
    if (n < 2) return;

    const layoutEl       = section.querySelector('.proof-stats__layout');
    const titleEl        = section.querySelector('.proof-stats__left');
    const titleHeadingEl = section.querySelector('.proof-stats__title'); // <h2> em si — ver measureCenterOffset()
    const stickyEl       = section.querySelector('.proof-stats__sticky');
    const cardsWrapperEl = section.querySelector('.proof-stats__cards-wrapper');
    const testimonialsEl = document.querySelector('.testimonials');

    // MODO EMPILHADO (2026-07-13, pedido explícito do usuário): abaixo de 1140px (mesmo
    // breakpoint do CSS, ver ".proof-stats__layout" no styles.css) a seção inteira vira
    // 1 coluna só (título em cima, cards embaixo, em fluxo normal) e o scroll-jack (300vh,
    // painel sticky, cards sobrepostos com translateY animado) fica DESLIGADO por
    // completo — os cards aparecem com scroll fluido normal, sem nenhuma animação de
    // sobreposição. `isStacked()` é consultada em toda função de medição abaixo pra cada
    // uma virar um no-op (ou limpar qualquer estilo inline que o modo desktop tenha
    // aplicado antes) nessa faixa de tela — dessa forma o layout empilhado definido no
    // CSS (ver media query "max-width: 1139px") fica livre pra funcionar sem nenhum
    // estilo inline de JS por cima atrapalhando.
    var STACK_BREAKPOINT = 1140;
    function isStacked() {
      return window.innerWidth < STACK_BREAKPOINT;
    }

    // Zonas calculadas a partir de vh (não frações fixas) pra deixar explícito
    // quanto de scroll cada card usa, e pra facilitar ajustar só um deles no
    // futuro sem precisar recalcular as frações à mão. CARD0_VH reduzido de 40
    // pra 20 (metade) a pedido do usuário, pra ele subir mais rápido (menos scroll
    // necessário) e ficar com uma velocidade (px por vh) mais parecida com a dos
    // outros 3. CLOSE_VH continua em 60 (inalterado desde a última mudança).
    var CARD0_VH  = 20; // vh do card-0 (era 40; reduzido pela metade pra ele subir mais rápido)
    var CLOSE_VH  = 60; // vh de cada card 1-3 (inalterado)
    var TOTAL_VH  = CARD0_VH + 3 * CLOSE_VH; // 200vh

    const zones = [
      [0, CARD0_VH / TOTAL_VH],                                   // card-0 ("Alívio de Dores")
      [CARD0_VH / TOTAL_VH, (CARD0_VH + CLOSE_VH) / TOTAL_VH],     // card-1
      [(CARD0_VH + CLOSE_VH) / TOTAL_VH, (CARD0_VH + 2 * CLOSE_VH) / TOTAL_VH], // card-2
      [(CARD0_VH + 2 * CLOSE_VH) / TOTAL_VH, 1],                   // card-3 ("Energia extra")
    ];

    var EDGE_GAP     = 96;   // distância desejada (px) entre o FINAL de um card e o COMEÇO do próximo
    var MAX_DARKNESS = 0.25; // opacidade máxima do overlay de escurecimento (sutil)

    // Largura da coluna do título (só importa em telas >= 1140px, ver media query em
    // ".proof-stats__layout" no CSS) — MEDIDA por JS a partir da linha mais larga
    // realmente renderizada, em vez de um valor px fixo "chutado" no CSS.
    // Histórico (2026-07-13): a coluna tinha sido fixada em 560px "no olho" (calculado
    // a partir de uma medição de largura de texto feita fora do navegador real do
    // usuário). O usuário reportou que sobrava um vão bem maior que o pedido (~180px
    // medidos no devtools, contra os 64px pedidos) entre o FIM do texto "poucas semanas"
    // e o card — ou seja, a fonte (Montserrat, via Google Fonts) renderiza essa linha
    // com uma largura diferente da que tínhamos estimado. Em vez de chutar outro valor
    // fixo, medimos a largura real (Range.getClientRects() dá o retângulo de cada linha
    // visual quebrada pelos <br> do título) e aplicamos como largura da coluna via
    // variável CSS `--proof-stats-title-col`. A coluna dos cards usa `1fr` no CSS: como
    // o container tem largura fixa (1140px, padrão do site) nesta faixa, o `1fr`
    // absorve automaticamente o espaço que sobra — o card sempre encosta na margem
    // direita padrão do site, e o gap de 64px (fixo, no CSS) fica sempre entre o fim
    // REAL do texto e o card, não entre uma largura de coluna estimada e o card.
    function measureTitleColumnWidth() {
      if (isStacked() || !layoutEl || !titleHeadingEl) return; // sem coluna nenhuma pra medir no modo empilhado
      var range = document.createRange();
      range.selectNodeContents(titleHeadingEl);
      var rects = Array.from(range.getClientRects());
      if (!rects.length) return;
      // BUG corrigido em 2026-07-13 (2ª rodada, sistema de quebra por quantidade de
      // linha): desde que o título passou a ter 8 pontos de <br> possíveis (4 visíveis
      // + 4 escondidos em desktop, ver .proof-stats__title-brk-b* no CSS), uma mesma
      // LINHA visual pode ser composta por vários fragmentos de texto/rects separados
      // (cada <br> — visível ou não — quebra o texto em nós separados no DOM, mesmo
      // quando o <br> escondido não causa quebra visual nenhuma). Pegar só a largura de
      // um rect isolado (como antes) SUBESTIMA a largura real da linha — mesmo bug já
      // documentado e corrigido em fitPainWarningText() logo abaixo neste arquivo.
      // Correção: agrupa os rects por linha visual (mesmo "top" arredondado) e usa a
      // largura da UNIÃO de cada grupo (direita mais à direita menos esquerda mais à
      // esquerda), não a largura de um fragmento isolado.
      var lines = {};
      rects.forEach(function(r) {
        var key = Math.round(r.top);
        if (!lines[key]) {
          lines[key] = { left: r.left, right: r.right };
        } else {
          lines[key].left = Math.min(lines[key].left, r.left);
          lines[key].right = Math.max(lines[key].right, r.right);
        }
      });
      var maxWidth = 0;
      Object.keys(lines).forEach(function(key) {
        var width = lines[key].right - lines[key].left;
        if (width > maxWidth) maxWidth = width;
      });
      if (maxWidth <= 0) return;
      // +2px de folga só pra absorver arredondamento de subpixel — não é uma "margem de
      // segurança" pra caber texto (a linha já está renderizada, a largura é a real).
      layoutEl.style.setProperty('--proof-stats-title-col', (Math.ceil(maxWidth) + 2) + 'px');
    }
    // Roda ANTES de measureCardsWrapperHeight logo abaixo — mudar a largura da coluna
    // do título muda a largura da coluna dos cards (via `1fr`), o que pode mudar como o
    // texto da descrição quebra dentro do card e, por consequência, a altura natural
    // que measureCardsWrapperHeight() vai calcular.
    measureTitleColumnWidth();
    window.addEventListener('resize', measureTitleColumnWidth);

    // Altura de ".proof-stats__cards-wrapper" (2026-07-13) — calculada a partir do
    // conteúdo REAL dos 4 cards, em vez de "esticar" (`flex:1`, removido do CSS) pra
    // igualar a altura da coluna do título. Bug que isso corrige: cada card é
    // `position:absolute; inset:8% 0` (altura = 84% da altura deste wrapper) com
    // `overflow:hidden` — antes, a altura do wrapper vinha inteiramente do título ao
    // lado (sem nenhuma relação com o texto dos cards), cortando até 114px de texto em
    // telas de notebook comuns (1024-1280px, ver [[proof_stats_correcoes]]). Decisão do
    // usuário (via AskUserQuestion): os 4 cards ficam com a MESMA altura — a do card
    // que precisar de mais espaço (hoje, "Melhor postura", o texto mais longo).
    // INSET_PERCENT precisa bater exatamente com o "8%" do CSS (`.proof-card--data`,
    // `inset: 8% 0`) — se um dos dois mudar no futuro, o outro precisa mudar junto.
    var INSET_PERCENT = 0.08;
    function measureCardsWrapperHeight() {
      if (isStacked()) {
        // Modo empilhado: os cards não são mais `position:absolute` dentro de um
        // wrapper de altura calculada — viram fluxo normal (ver CSS), então a altura
        // do wrapper deve ser automática (limpa qualquer valor inline deixado pelo
        // modo desktop antes de uma redimensionada pra baixo do breakpoint).
        if (cardsWrapperEl) cardsWrapperEl.style.height = '';
        return;
      }
      if (!cardsWrapperEl || !cards.length) return;
      var maxContentHeight = 0;
      cards.forEach(function(card) {
        var cardStyle    = getComputedStyle(card);
        var paddingTop    = parseFloat(cardStyle.paddingTop) || 0;
        var paddingBottom = parseFloat(cardStyle.paddingBottom) || 0;
        var contentHeight = paddingTop + paddingBottom;
        var children = [
          card.querySelector('.proof-card__headline'),
          card.querySelector('.proof-card__tags'),
          card.querySelector('.proof-card__desc')
        ];
        children.forEach(function(el) {
          if (!el) return;
          var marginBottom = parseFloat(getComputedStyle(el).marginBottom) || 0;
          contentHeight += el.getBoundingClientRect().height + marginBottom;
        });
        if (contentHeight > maxContentHeight) maxContentHeight = contentHeight;
      });
      // contentHeight ocupa (1 - 2*INSET_PERCENT) da altura do wrapper (8% de sobra em
      // cima + 8% em baixo, ver "inset: 8% 0" no CSS) — inverte a conta pra achar o
      // wrapper necessário.
      var wrapperHeight = maxContentHeight / (1 - 2 * INSET_PERCENT);
      cardsWrapperEl.style.height = wrapperHeight.toFixed(2) + 'px';
    }
    // Precisa rodar ANTES de measureCenterOffset/measureCardHeight abaixo — os dois
    // dependem da altura real do card, que só fica correta depois desta medição.
    measureCardsWrapperHeight();
    window.addEventListener('resize', measureCardsWrapperHeight);

    // Distância (em px) entre a posição natural (topo, 96px) do título/card-0 e a
    // posição centralizada na tela. Medimos a diferença entre .proof-stats__layout
    // (nunca transformado diretamente — só seus filhos título/card-0 são) e
    // .proof-stats__sticky (o painel de 100vh): essa diferença é só o padding-top
    // (96px) do painel, um valor de layout normal que não muda com o scroll, então
    // dá pra medir a qualquer momento (mesmo antes da seção ficar "grudada" no
    // topo/sticky) — não precisa esperar a seção estar na posição pinada pra medir
    // certo. Recalculada no resize porque a posição centralizada depende da altura
    // da viewport.
    //
    // CUIDADO (bug corrigido em 2026-07-13, ver measureCardsWrapperHeight() acima):
    // "centeredTop" precisa da altura do TÍTULO (o texto em si), não de
    // `layoutEl.getBoundingClientRect().height` (a altura da GRADE inteira). Antes da
    // correção de measureCardsWrapperHeight(), as duas coincidiam por acaso (a coluna
    // dos cards tinha altura ~0 de conteúdo próprio — só filhos `position:absolute` —
    // então `align-items:stretch` esticava ela pra bater com o título, e o título
    // acabava sendo a peça mais alta da grade). Agora a coluna dos cards tem altura
    // PRÓPRIA (calculada a partir do texto real deles) que costuma ser MAIOR que a do
    // título — então é ELA que passou a definir a altura da linha do grid, e
    // `.proof-stats__left` (a coluna do título) é que estica pra baixo pra bater com
    // ela, sobrando espaço vazio abaixo do texto. Usar `layoutRect.height` nesse
    // cenário fazia o título "centralizar" com base numa altura bem maior que a dele
    // mesmo, jogando a posição pra fora do centro real da tela (bug reportado pelo
    // usuário: título menor e fora do centro vertical). Corrigido medindo a altura do
    // PRÓPRIO `<h2>` (`.proof-stats__title`, elemento de texto puro, nunca esticado
    // pelo grid — só o `div.proof-stats__left` que o envolve é esticado, o `<h2>`
    // dentro dele mantém sua altura natural de conteúdo). */
    var centerOffset = 0;
    function measureCenterOffset() {
      if (isStacked() || !layoutEl || !stickyEl || !titleHeadingEl) { centerOffset = 0; return; } // sem centralização calculada no modo empilhado — título fica na posição normal do fluxo
      var layoutRect   = layoutEl.getBoundingClientRect();
      var stickyRect   = stickyEl.getBoundingClientRect();
      var naturalTop   = layoutRect.top - stickyRect.top; // offset fixo dentro do painel (~96px)
      var centeredTop  = (window.innerHeight - titleHeadingEl.getBoundingClientRect().height) / 2;
      centerOffset = centeredTop - naturalTop;
    }
    measureCenterOffset();
    window.addEventListener('resize', measureCenterOffset);

    // Altura real de um card (todos têm a mesma altura, "inset: 8% 0" na mesma
    // .proof-stats__sticky de 100vh) — getBoundingClientRect().height não é afetado
    // pelo translateY, então dá pra medir a qualquer momento. Usada pra converter a
    // distância desejada de "fim de um card até começo do próximo" (EDGE_GAP, 96px)
    // num deslocamento topo-a-topo real: STEP = cardHeight + EDGE_GAP. Sem isso, um
    // deslocamento topo-a-topo de 96px faria os cards se sobreporem quase por
    // inteiro (a altura do card é bem maior que 96px), deixando praticamente
    // nenhum espaço visível entre o final de um e o começo do outro. Recalculada
    // no resize porque a altura do card depende de %, relativa à altura da tela.
    var cardHeight = 0;
    function measureCardHeight() {
      // No modo empilhado o STEP/cascata não existe (cards em fluxo normal, sem
      // translateY animado) — zera pra deixar claro que não tem uso nessa faixa.
      cardHeight = (!isStacked() && cards[0]) ? cards[0].getBoundingClientRect().height : 0;
    }
    measureCardHeight();
    window.addEventListener('resize', measureCardHeight);

    // Distância pedida pelo usuário entre a BASE do card-3 ("Energia extra") e o
    // texto "A confiança é a maior prova..." (.testimonials) — SEMPRE 160px, do
    // primeiro momento em que o texto aparece em cena até ele assentar (não é uma
    // aproximação gradual: ver "tracking em tempo real" em update() abaixo). Ver
    // comentário completo em .testimonials no styles.css sobre por que isso é
    // seguro (nunca cobre o card/título).
    var TESTIMONIALS_GAP = 160;
    var testimonialsMarginTop = 0;
    var testimonialsPaddingTop = 0;
    // Distância (px) do topo do painel sticky até a base NATURAL (sem transform) do
    // card — usada tanto pra calibrar o margin-top (posição de repouso, depois que o
    // scroll-jack libera) quanto pro tracking em tempo real dentro de update() (ver
    // abaixo). Guardada como um OFFSET relativo ao topo do sticky (não uma posição
    // de tela absoluta), pra ficar correta mesmo quando medida antes da seção estar
    // "grudada" no topo (ex: no load da página, ver measureCenterOffset acima pelo
    // mesmo motivo).
    var cardBottomOffsetWithinSticky = 0;
    function measureTestimonialsGap() {
      if (isStacked()) {
        // Modo empilhado: sem scroll-jack, sem painel sticky — os Depoimentos seguem
        // o fluxo normal da página, com o espaçamento padrão já definido no CSS
        // (.testimonials { padding: var(--sp-11) 0 }, 96px). Limpa qualquer
        // margin-top/transform inline deixado pelo modo desktop.
        if (testimonialsEl) { testimonialsEl.style.marginTop = ''; testimonialsEl.style.transform = ''; }
        testimonialsMarginTop = 0;
        return;
      }
      if (!testimonialsEl || !cardsWrapperEl || !stickyEl) { testimonialsMarginTop = 0; return; }
      // .proof-card--data usa "inset: 8% 0" dentro de .proof-stats__cards-wrapper,
      // então a base NATURAL (sem transform) de qualquer card fica a 92% da altura
      // do wrapper (8% do topo + 84% de altura do próprio card). Comparando essa
      // base com o fim do painel sticky (100vh) medimos o espaço "morto" que sobra
      // abaixo do card dentro do painel — é esse espaço que faz o padding-top de
      // 96px do .testimonials, sozinho, resultar numa distância visual muito maior
      // que 96px na prática (o padding é contado a partir do fim da CAIXA sticky de
      // 100vh, não do fim real do card, que normalmente é bem menor que 100vh).
      var wrapperRect = cardsWrapperEl.getBoundingClientRect();
      var stickyRect  = stickyEl.getBoundingClientRect();
      cardBottomOffsetWithinSticky = (wrapperRect.top - stickyRect.top) + wrapperRect.height * 0.92;
      var emptyBelowCard = stickyRect.height - cardBottomOffsetWithinSticky;
      testimonialsPaddingTop = parseFloat(getComputedStyle(testimonialsEl).paddingTop) || 0;
      // margin-top de REPOUSO (usado só depois que o scroll-jack libera, quando o
      // texto volta a ser conteúdo 100% normal, sem nenhum transform por cima — ver
      // update() abaixo): gap final = margin-top + padding-top + emptyBelowCard (os
      // 3 se somam, do topo do .testimonials até o texto) => margin-top = GAP -
      // padding - vazio. Normalmente dá bem negativo (a seção "sobe" pra fechar o
      // espaço morto).
      testimonialsMarginTop = TESTIMONIALS_GAP - testimonialsPaddingTop - emptyBelowCard;
      testimonialsEl.style.marginTop = testimonialsMarginTop.toFixed(2) + 'px';
    }
    measureTestimonialsGap();
    window.addEventListener('resize', measureTestimonialsGap);

    // As medidas acima (centerOffset, cardHeight, gap dos depoimentos) dependem da
    // altura real do conteúdo (título e texto dos cards). O site carrega fontes via
    // Google Fonts com "display:swap" (ver <link> no <head>) — o texto nasce numa
    // fonte de fallback e TROCA pra Roboto/Montserrat assim que o arquivo da fonte
    // termina de baixar, o que pode mudar a altura real do texto (e por consequência
    // do card/título) DEPOIS que essas funções já rodaram no load. Sem isso, o STEP
    // calculado ficava baseado numa altura de card desatualizada (menor, com a fonte
    // de fallback), fazendo o vão visível de "96px entre cards" encolher pra bem
    // menos que 96px assim que a fonte real carregava — bug real reportado pelo
    // usuário (media 42px em vez de 96px). Corrigido com dois mecanismos
    // complementares: (1) ResizeObserver nos elementos medidos, que reage a
    // QUALQUER mudança de tamanho renderizado (troca de fonte, texto quebrando
    // diferente, zoom, etc.), e (2) document.fonts.ready, que garante uma remedição
    // assim que as fontes realmente terminarem de carregar (mais direto que esperar
    // um resize).
    // measureCardsWrapperHeight() SEMPRE primeiro nos blocos abaixo — measureCardHeight()
    // (e, por consequência, measureTestimonialsGap()) só mede certo depois que a altura do
    // wrapper já reflete o conteúdo real dos cards (ver comentário completo acima da função).
    //
    // IMPORTANTE: não observar `cards[0]` diretamente aqui (como existia antes só pra
    // measureCardHeight) — measureCardsWrapperHeight() muda a altura do próprio card (via
    // `cardsWrapperEl.style.height`, que o "inset: 8% 0" do CSS converte em altura do
    // card), o que re-disparalaria um ResizeObserver ligado a `cards[0]`. Observar só
    // `layoutEl` (cuja altura NÃO depende da altura que definimos no wrapper dos cards,
    // ver comentário no CSS) evita esse risco de loop de retrigger.
    if (window.ResizeObserver) {
      if (layoutEl) new ResizeObserver(function() {
        measureTitleColumnWidth();
        measureCardsWrapperHeight();
        measureCenterOffset();
        measureCardHeight();
      }).observe(layoutEl);
      if (cardsWrapperEl) new ResizeObserver(measureTestimonialsGap).observe(cardsWrapperEl);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        measureTitleColumnWidth();
        measureCardsWrapperHeight();
        measureCenterOffset();
        measureCardHeight();
        measureTestimonialsGap();
      });
    }

    // Limpa qualquer estilo inline que o modo DESKTOP (scroll-jack) tenha aplicado —
    // chamada só UMA VEZ, no exato momento em que a tela cruza pra baixo de
    // STACK_BREAKPOINT (ver listener de resize logo abaixo), nunca a cada scroll/resize
    // dentro do mesmo modo (seria desperdício). Sem isso, redimensionar a janela do
    // desktop pra um tamanho empilhado no meio de um scroll já em progresso deixaria os
    // cards/título/depoimentos "presos" num transform inline antigo, que tem prioridade
    // sobre a regra `transform: none` da media query no CSS (inline sempre vence
    // stylesheet, não importa a especificidade) — o layout empilhado pareceria quebrado
    // mesmo com o CSS certo.
    function clearDesktopInlineStyles() {
      cards.forEach(function(card) {
        card.style.transform = '';
        card.style.setProperty('--card-darkness', '0');
      });
      if (titleEl) titleEl.style.transform = '';
      if (testimonialsEl) { testimonialsEl.style.transform = ''; testimonialsEl.style.marginTop = ''; }
      if (cardsWrapperEl) cardsWrapperEl.style.height = '';
    }

    let rafScheduled = false;

    function update() {
      rafScheduled = false;
      if (isStacked()) return; // modo empilhado: sem animação, fluxo normal (ver CSS)

      const rect       = section.getBoundingClientRect();
      const scrolled   = Math.max(0, -rect.top);
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress   = scrollable > 0 ? Math.min(1, scrolled / scrollable) : 0;

      // --- Card-0: sobe da posição centralizada (centerOffset) até o topo (0) ---
      var zone0 = zones[0];
      var t0 = progress <= zone0[0] ? 0 : (progress >= zone0[1] ? 1 : (progress - zone0[0]) / (zone0[1] - zone0[0]));
      var positions = new Array(n);
      positions[0] = (1 - t0) * centerOffset;
      cards[0].style.transform = 'translateY(' + positions[0].toFixed(2) + 'px)';

      // --- Cards 1..n-1: cascata em leque. Cada card acompanha o anterior a uma
      // distância topo-a-topo fixa de STEP (altura do card + 96px, ver
      // measureCardHeight acima) — positions[i-1] já foi calculado nesse mesmo
      // frame, então o "encadeamento" reflete a posição atual do card de cima,
      // esteja ele ainda subindo (card-0) ou já travado (0). Só na sua própria zona
      // é que o card fecha essa distância (t: 0 -> 1, STEP -> 0px), terminando 100%
      // sobreposto ao anterior — contínuo, sem nenhuma pausa/dwell (uma versão com
      // pausa foi tentada e revertida a pedido do usuário, que preferiu o
      // movimento contínuo original só com a distância corrigida). STEP (não
      // EDGE_GAP puro) garante que os 96px sejam medidos do FINAL de um card até o
      // COMEÇO do próximo, não topo-a-topo. ---
      var STEP = cardHeight + EDGE_GAP;
      var lastT = t0; // fração "fechada" do último card, usada pra sincronizar o título
      for (var i = 1; i < n; i++) {
        var zone   = zones[i];
        var zStart = zone[0];
        var zEnd   = zone[1];
        var t;
        if (progress < zStart) {
          t = 0; // ainda não é a vez desse card fechar -- só acompanha o anterior a STEP de distância
        } else {
          t = progress >= zEnd ? 1 : (progress - zStart) / (zEnd - zStart);
        }
        positions[i] = positions[i - 1] + (1 - t) * STEP;
        cards[i].style.transform = 'translateY(' + positions[i].toFixed(2) + 'px)';
        if (i === n - 1) lastT = t;
      }

      // --- Título: travado na posição centralizada até o último card (card-3,
      // "Energia extra") começar a fechar sua própria distância; a partir daí sobe
      // em exata sincronia com ele (mesma fração t), terminando alinhado com o
      // resto do conteúdo bem no instante em que o scroll-jack libera. ---
      if (titleEl) {
        titleEl.style.transform = 'translateY(' + ((1 - lastT) * centerOffset).toFixed(2) + 'px)';
      }

      // --- Depoimentos: SEMPRE a 160px (TESTIMONIALS_GAP) da base do card-3, do
      // primeiro instante em que aparece em cena até ele assentar — não uma
      // aproximação gradual. Espelhar só "positions[n-1]" (como antes) NÃO bastava:
      // como o .testimonials também se move naturalmente com o scroll normal da
      // página (não vive dentro do painel sticky), a distância visível ficava
      // "encolhendo" de longe até 160px só no final, em vez de nascer já em 160px
      // (bug reportado pelo usuário). Corrigido calculando, a cada frame, a POSIÇÃO
      // DE TELA exata que o .testimonials precisa ter pra manter esse gap fixo, e
      // cancelando o deslocamento natural do scroll — na prática, um "position:
      // fixed" calculado via transform em vez de propriedade CSS (evita o problema
      // de position:fixed remover o elemento do fluxo, que empurraria o conteúdo
      // abaixo/warn-tape pra cima e pra baixo repetidamente durante o scroll-jack).
      //
      // - cardBottomOffsetWithinSticky + positions[n-1] = posição de tela atual da
      //   base do card-3 (válido enquanto a seção está grudada/pinada, progress<1).
      // - Somando TESTIMONIALS_GAP (160) e subtraindo testimonialsPaddingTop (96,
      //   porque o padding-top do próprio .testimonials já cobre parte da distância
      //   entre o topo do elemento e o texto) chegamos na posição de tela que o
      //   TOPO do .testimonials precisa ocupar.
      // - "rect.top + section.offsetHeight + testimonialsMarginTop" é onde o topo
      //   do .testimonials estaria na tela SEM nenhum transform (posição natural,
      //   já com o margin-top calibrado em measureTestimonialsGap() — rect já inclui
      //   o scroll atual, então não precisamos somar/subtrair scrollY à parte).
      // - A diferença entre as duas é o transform necessário pra "grudar" o
      //   .testimonials exatamente na posição de tela desejada.
      //
      // Matematicamente, esse transform converge pra 0 exatamente no instante em
      // que o scroll-jack libera (progress=1) — por isso dá pra simplesmente
      // desligar esse cálculo e usar transform:translateY(0) a partir daí (o
      // margin-top calibrado sozinho já mantém os 160px corretos pelo resto do
      // scroll normal, sem precisar de mais nenhum ajuste por frame). ---
      if (testimonialsEl) {
        if (progress < 1) {
          var testimonialsNaturalTopViewport = rect.top + section.offsetHeight + testimonialsMarginTop;
          var testimonialsTargetTopViewport  = cardBottomOffsetWithinSticky + positions[n - 1] + TESTIMONIALS_GAP - testimonialsPaddingTop;
          testimonialsEl.style.transform = 'translateY(' + (testimonialsTargetTopViewport - testimonialsNaturalTopViewport).toFixed(2) + 'px)';
        } else {
          testimonialsEl.style.transform = 'translateY(0px)';
        }
      }

      // --- Escurecimento do card de baixo enquanto o próximo fecha a distância por cima dele ---
      cards.forEach(function(card, i) {
        var nextZone = zones[i + 1];
        if (!nextZone) {
          card.style.setProperty('--card-darkness', '0');
          return;
        }
        var darkStart = nextZone[0];
        var darkEnd   = nextZone[1];
        var darkness;
        if (progress <= darkStart)  darkness = 0;
        else if (progress >= darkEnd) darkness = MAX_DARKNESS;
        else darkness = MAX_DARKNESS * (progress - darkStart) / (darkEnd - darkStart);
        card.style.setProperty('--card-darkness', darkness.toFixed(3));
      });
    }

    window.addEventListener('scroll', function() {
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    // Detecta quando a tela CRUZA o breakpoint de 1140px (entra ou sai do modo
    // empilhado) — as funções de medição acima já são chamadas em todo resize
    // independentemente (idempotentes, cada uma já checa `isStacked()` sozinha), mas
    // SÓ nessa transição específica é que precisamos (1) limpar estilos inline
    // deixados pelo modo desktop, ao entrar no empilhado, ou (2) remedir tudo do zero
    // e retomar a animação, ao voltar pro desktop.
    var wasStacked = isStacked();
    window.addEventListener('resize', function() {
      var stacked = isStacked();
      if (stacked === wasStacked) return;
      wasStacked = stacked;
      if (stacked) {
        clearDesktopInlineStyles();
      } else {
        measureTitleColumnWidth();
        measureCardsWrapperHeight();
        measureCenterOffset();
        measureCardHeight();
        measureTestimonialsGap();
        update();
      }
    });

    update();
  }

  initScrollCards();

  /* ---------- PAIN WARNING CARD (2ª dobra) ----------
     O card vermelho encolhe para abraçar o texto (ver CSS: width: fit-content
     no .pain__warning). Só que o parágrafo tem um max-width fixo em CSS para
     definir ONDE o texto quebra a linha — e por causa disso a caixa do próprio
     parágrafo fica do tamanho desse max-width, mesmo quando a linha mais larga
     "de verdade" (o texto renderizado) é menor. Isso cria um espaço à direita
     maior do que o espaço à esquerda do ícone. Aqui a gente mede a largura real
     da linha mais larga (via getClientRects) e encolhe o parágrafo para esse
     valor exato, sem precisar de quebra de linha manual no HTML. */
  function fitPainWarningText() {
    var text = document.querySelector('.pain__warning-text');
    if (!text) return;
    text.style.width = '';
    var range = document.createRange();
    range.selectNodeContents(text);
    var rects = Array.from(range.getClientRects());
    if (!rects.length) return;
    // Agrupa os fragmentos (o <strong> quebra o texto em vários rects) por
    // linha visual (mesmo "top") para achar a largura real de cada linha —
    // não apenas a largura de um fragmento isolado.
    var lines = {};
    rects.forEach(function (r) {
      var key = Math.round(r.top);
      if (!lines[key]) {
        lines[key] = { left: r.left, right: r.right };
      } else {
        lines[key].left = Math.min(lines[key].left, r.left);
        lines[key].right = Math.max(lines[key].right, r.right);
      }
    });
    var maxLineWidth = 0;
    Object.keys(lines).forEach(function (key) {
      var width = lines[key].right - lines[key].left;
      if (width > maxLineWidth) maxLineWidth = width;
    });
    if (maxLineWidth > 0) text.style.width = Math.ceil(maxLineWidth) + 'px';
  }

  fitPainWarningText();
  window.addEventListener('resize', function () {
    clearTimeout(window.__painWarningResizeTimer);
    window.__painWarningResizeTimer = setTimeout(fitPainWarningText, 150);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitPainWarningText);
  }

  /* ---------- OFERTA — FOTO "pilates-001" COM MESMA ALTURA DO CONTEÚDO ----------
     A pedido do usuário, a foto (.offer-photo__slot) deve ter a MESMA altura vertical
     que o bloco de conteúdo à esquerda (.offer-info: título + subtítulo + checklist +
     botão). A primeira tentativa foi 100% CSS (grid align-items:stretch + height:100% +
     aspect-ratio na foto), mas isso criava um bug: com height:100%+aspect-ratio, o
     navegador calcula uma altura "natural" pra foto a partir da LARGURA da coluna
     (bem larga, sem max-width) ANTES de aplicar o stretch — e essa altura natural
     (largura × 4/3) normalmente é MAIOR que a altura real do texto, fazendo a linha do
     grid crescer pra caber a foto (não o texto) e a foto acabava ultrapassando o botão
     por baixo, com espaço vazio sobrando atrás do texto (bug reportado pelo usuário com
     print). Ver comentário completo em .offer-photo__slot no CSS.
     Solução: medir a altura REAL renderizada de .offer-info (igual measureTestimonialsGap/
     measureCenterOffset acima) e aplicar como px explícito na foto — sem cálculo circular
     do navegador. Só se aplica acima do breakpoint de 864px (onde o grid ainda é 2 colunas
     lado a lado — ver @media no CSS); abaixo disso o JS limpa o inline style pra deixar a
     regra do CSS (@media, largura cheia + aspect-ratio) assumir — senão o inline style
     (mais específico que a media query) continuaria valendo mesmo com o grid empilhado.
     ATUALIZADO 2026-07-14: breakpoint era 800px, subiu pra 864px junto com o CSS (a foto
     agora é escondida por completo abaixo de 864px, não só empilhada — ver .offer-photo
     no CSS) — sem essa atualização o JS ficaria medindo/aplicando altura inline numa foto
     já escondida entre 801-864px, que é inofensivo (elemento invisível) mas inconsistente. */
  function fitOfferPhotoHeight() {
    var info = document.querySelector('.offer-info');
    var slot = document.querySelector('.offer-photo__slot');
    if (!info || !slot) return;
    if (window.matchMedia('(max-width: 864px)').matches) {
      slot.style.height = '';
      slot.style.width = '';
      return;
    }
    var height = info.getBoundingClientRect().height;
    if (height > 0) {
      slot.style.height = height + 'px';
      slot.style.width = 'auto'; // largura passa a ser derivada da altura pelo aspect-ratio:3/4 do CSS
    }
  }

  fitOfferPhotoHeight();
  window.addEventListener('resize', function () {
    clearTimeout(window.__offerPhotoResizeTimer);
    window.__offerPhotoResizeTimer = setTimeout(fitOfferPhotoHeight, 150);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitOfferPhotoHeight);
  }
  // Reage também a mudanças no conteúdo de .offer-info que não vêm de resize/fonte
  // (ex: nenhuma esperada hoje, mas segue o mesmo padrão defensivo usado acima).
  if (window.ResizeObserver) {
    var offerInfoEl = document.querySelector('.offer-info');
    if (offerInfoEl) new ResizeObserver(fitOfferPhotoHeight).observe(offerInfoEl);
  }

  /* ---------- FAQ — todos os 6 retângulos com a mesma altura ----------
     A pedido do usuário (2026-07-15): quando o texto de alguma pergunta quebra pra 2
     linhas, o retângulo (.faq__item) dela fica mais alto que os outros — o pedido é
     que TODOS os 6 retângulos fiquem do tamanho do mais alto.

     MUDANÇA (mesmo dia, 2ª rodada): a 1ª versão só igualava abaixo de 800px (faixa
     empilhada, 1 coluna visual). Usuário mandou print mostrando o mesmo problema
     também no layout de 2 colunas lado a lado (> 800px) — ex: linha 1 com "O Pilates
     é indicado para iniciantes?" (1 linha) ao lado de "Preciso ter preparo físico
     para começar?" (2 linhas), retângulos de alturas diferentes na mesma fileira.
     Removida a restrição de largura — agora iguala em QUALQUER largura de tela, os
     6 juntos (não só par a par na mesma fileira), continuando recalculado no resize
     (a quantidade de perguntas que quebram linha muda conforme a tela).

     Por que via JS em vez de CSS puro (ex: grid-auto-rows:1fr, técnica já usada em
     .recognition__list): cada pergunta tem um acordeão (.faq__answer, expande ao
     clicar) — se a igualação de altura fosse feita via CSS Grid no `.faq__item`
     inteiro (que contém a pergunta E a resposta), abrir UM card mudaria o "maior
     conteúdo" do grid e o CSS recalcularia TODOS os 6 retângulos pra ficarem do
     tamanho do card aberto (~250-300px) — bug visual grande, com espaço vazio enorme
     nos fechados. Medindo e igualando só `.faq__question` (a pergunta em si, elemento
     IRMÃO de `.faq__answer`, não pai) resolve isso: a altura de `.faq__question`
     nunca muda com o acordeão aberto/fechado (só depende do próprio texto da
     pergunta), então dá pra igualar com segurança sem acoplar no estado do acordeão —
     confirmado com Playwright: abrir um card muda só a altura DELE (~276px), as
     outras 5 continuam exatamente iguais entre si. Isso vale em QUALQUER largura,
     inclusive no layout de 2 colunas (cada `.faq__col` é sua própria pilha flex —
     ver CSS — mas `.faq__question` é medido/igualado direto pelo JS, sem depender
     da estrutura de colunas). `.faq__question` já é `display:flex;align-items:center`,
     então o conteúdo (ícone+texto) fica centralizado verticalmente dentro do
     `min-height` aplicado — mesmo padrão usado em `.recognition__text` (ver CSS).
     Como `.faq__item` não tem padding/borda própria além da borda de 1px (a
     pergunta praticamente preenche o retângulo fechado), a altura de
     `.faq__question` dita a altura do retângulo inteiro sem precisar tocar em
     `.faq__item`. */
  function equalizeFaqQuestionHeights() {
    var questions = document.querySelectorAll('.faq__question');
    if (!questions.length) return;

    // Reseta antes de medir, senão um min-height aplicado numa medição anterior
    // (ex: de uma largura de tela diferente, onde outra pergunta quebrava linha)
    // distorceria a medição atual.
    questions.forEach(function (q) { q.style.minHeight = ''; });

    var maxHeight = 0;
    questions.forEach(function (q) {
      var h = q.getBoundingClientRect().height;
      if (h > maxHeight) maxHeight = h;
    });
    if (maxHeight > 0) {
      questions.forEach(function (q) { q.style.minHeight = maxHeight + 'px'; });
    }
  }

  equalizeFaqQuestionHeights();
  window.addEventListener('resize', function () {
    clearTimeout(window.__faqQuestionResizeTimer);
    window.__faqQuestionResizeTimer = setTimeout(equalizeFaqQuestionHeights, 150);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(equalizeFaqQuestionHeights);
  }

  /* ---------- FINAL CTA — SLIDESHOW DE FOTOS ("Imagine Como Será...") ----------
     9 fotos empilhadas no mesmo espaço; a cada 3s passa pra próxima em ordem
     (1→2→...→9→1...), com fade suave (opacidade, ver CSS .final-cta__media-img). */
  var finalCtaMedia = document.getElementById('finalCtaMedia');
  if (finalCtaMedia) {
    var finalCtaSlides = Array.from(finalCtaMedia.querySelectorAll('.final-cta__media-img'));
    if (finalCtaSlides.length > 1) {
      var finalCtaIndex = 0;
      setInterval(function () {
        finalCtaSlides[finalCtaIndex].classList.remove('is-active');
        finalCtaIndex = (finalCtaIndex + 1) % finalCtaSlides.length;
        finalCtaSlides[finalCtaIndex].classList.add('is-active');
      }, 4000);
    }
  }

  /* ---------- BLOQUEIO BÁSICO DE CLIQUE-DIREITO/ARRASTAR NAS FOTOS ----------
     A pedido do usuário (2026-07-15), pra dificultar o "clique direito > salvar
     imagem" casual. IMPORTANTE — isso é só um obstáculo cosmético, não uma proteção
     de verdade: não impede print de tela, inspecionar elemento, aba de rede do
     navegador, nem funciona de forma confiável em celular. Serve só pra parar quem
     não sabe usar essas ferramentas. Escopado só em <img> (via delegação de evento
     no document) — o resto da página (texto, botões) continua com o menu de
     contexto normal, sem incomodar quem só quer copiar um trecho de texto. */
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

});

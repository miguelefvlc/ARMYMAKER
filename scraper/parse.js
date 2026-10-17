// Parsers for the server-rendered HTML of wg.easyarmy.com (Bolt Action).
// Each function receives raw HTML and returns plain JSON-friendly objects.
import * as cheerio from 'cheerio';

const clean = (s) => (s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

/** Extract "+7pts each", "for +15pts each", "-5pts" ... into { points, per } */
export function parseCost(text) {
  const m = text.match(/([+-]?\s*\d+)\s*pts?\b/i);
  if (!m) return { points: null, per: null };
  const points = parseInt(m[1].replace(/\s/g, ''), 10);
  let per = 'unit';
  if (/per (figure|model|man)/i.test(text)) per = 'model';
  else if (/\beach\b/i.test(text)) per = 'each';
  return { points, per };
}

/** NewPlatoon page: list of platoon templates (data-c) */
export function parseNewPlatoon(html) {
  const $ = cheerio.load(html);
  const countries = [];
  $('#Country option').each((_, o) => {
    const v = $(o).attr('value');
    if (v && v !== '0') countries.push({ id: Number(v), name: clean($(o).text()), selected: $(o).is('[selected]') });
  });
  const templates = [];
  $('tr.sp_r').each((_, tr) => {
    const tds = $(tr).children('td').map((_, td) => clean($(td).text())).get();
    templates.push({
      id: Number($(tr).attr('data-c')),
      country: tds[0],
      name: tds[4] && (tds[2] ?? '').endsWith(tds[4]) ? tds[2].slice(0, -tds[4].length).trim() : (tds[2] ?? ''),
      source: tds[4] ?? '',
    });
  });
  return { countries, templates };
}

/** Platoon page: columns -> boxes (slots) -> candidate units (data-seq) */
export function parsePlatoon(html) {
  const $ = cheerio.load(html);
  const title = clean($('.p_Title').clone().children().remove().end().text());
  const source = clean($('.p_src').text());
  const columns = [];
  $('.p_out .column').each((ci, col) => {
    const boxes = [];
    $(col).children('.box').each((_, box) => {
      const $box = $(box);
      const section = clean($box.find('.section').first().clone().children().remove().end().text());
      const units = [];
      $box.find('.p[data-seq]').each((_, p) => {
        units.push({
          cbID: Number($(p).attr('data-seq')),
          name: clean($(p).find('.u').text()),
          selected: !/BWhite/i.test($(p).find('.p_cb img').attr('src') || ''),
        });
      });
      boxes.push({ section, required: $box.hasClass('required'), units });
    });
    columns.push(boxes);
  });
  const platoonButtons = $('.p_btns button').map((_, b) => Number($(b).attr('data-seq'))).get();
  return { title, source, columns, platoonButtons };
}

/** Unit page: everything shown in the unit form */
export function parseUnit(html) {
  const $ = cheerio.load(html);
  const unit = {
    name: clean($('.u_title').text()),
    source: clean($('.u_pdfpage').text()),
    experience: [],
    profile: {},
    options: [],
    period: null,
    image: null,
    weapons: [],
    weaponNotes: [],
    rules: [],
    armyRules: [],
    notes: clean($('.u_notes').text()) || null,
  };

  // Experience levels / base cost
  $('input[name="Choice"]').each((_, inp) => {
    const box = $(inp).closest('.u_o');
    const p = parseInt(clean(box.find('.u_pnts').text()), 10);
    unit.experience.push({
      choice: Number($(inp).attr('value')),
      level: clean(box.find('.opN').text()),
      points: Number.isNaN(p) ? 0 : p,
      checked: $(inp).is('[checked]'),
    });
  });

  // Profile rows (Composition, Weapons, Special Rules, Damage Value, ...). Multi-line values joined with \n
  $('.u_o.bl').each((_, row) => {
    const k = clean($(row).find('.lc').first().text());
    const srHtml = $(row).find('.sr').first().html() || '';
    const v = srHtml.split(/<br\s*\/?>/i).map((s) => clean(cheerio.load(s).text())).filter(Boolean).join('\n');
    if (k) unit.profile[k] = v;
  });

  // Options, in document order. Two kinds of header lines:
  //  - <u>Title</u>  -> section title, applies to all following options until the next header
  //  - "Add up to 7 men with rifles at:" -> lead-in, applies only to following "+Npts ..." lines
  let group = null;
  let groupKind = null;
  $('.u_opts form').children('.u_o').each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('bl')) return; // profile row
    const inp = $el.find('input[type="checkbox"], input[type="radio"]').not('[name="Choice"]').first();
    if (!inp.length) {
      const t = clean($el.clone().find('b').remove().end().text());
      group = t || null;
      groupKind = $el.find('u').length ? 'title' : 'lead';
      return;
    }
    const sel = $el.find('select').first();
    const values = sel.length ? sel.find('option').map((_, o) => Number($(o).attr('value'))).get() : [];
    const text = clean($el.clone().find('select, input').remove().end().text()).replace(/^Options:\s*/i, '');
    if (groupKind === 'lead' && !/^[+-]\s*\d/.test(text)) { group = null; groupKind = null; }
    unit.options.push({
      id: Number(inp.attr('value')),
      input: inp.attr('type'),
      name: inp.attr('name'),
      group,
      text,
      ...parseCost(text),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      selectName: sel.attr('name') || null,
      disabled: inp.is('[disabled]'),
    });
  });

  // Period (E/M/L)
  $('div').each((_, d) => {
    if (clean($(d).text()) === 'Period' && $(d).children().length === 0) {
      unit.period = clean($(d).next().text()) || null;
      return false;
    }
  });

  // Image
  const img = $('.u_img img').first().attr('src');
  if (img) unit.image = img;

  // Weapons table (handles both Infantry/Artillery tables and Vehicle tables)
  const rawHeaders = $('.u_items table tr').first().find('th').map((_, th) => clean($(th).text())).get();
  const isVehicleTable = rawHeaders.some((h) => /vehicle/i.test(h));
  unit.isVehicleTable = isVehicleTable;

  let currentVariant = null;
  let lastWeaponName = null;

  $('.u_items table tr').slice(1).each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length === 1) {
      const text = clean(tds.eq(0).text());
      if (text) {
        if (isVehicleTable) {
          currentVariant = text;
        } else {
          unit.weaponNotes.push(text);
        }
      }
    } else if (tds.length === rawHeaders.length && tds.length >= 5) {
      const c0 = clean(tds.eq(0).text());
      const c1 = clean(tds.eq(1).text());
      const c2 = clean(tds.eq(2).text());
      const c3 = clean(tds.eq(3).text());
      const c4 = clean(tds.eq(4).text());

      if (isVehicleTable && !c0) {
        // Vehicle chassis row (Type, Transport, DV, Special)
        unit.weapons.push({
          rowType: 'vehicle_stat',
          variant: currentVariant || unit.name,
          Weapons: currentVariant || unit.name,
          Range: c1 || '-',
          Shots: c2 || '-',
          Pen: c3 || '-',
          Special: c4 || '-',
        });
      } else {
        let wName = c0;
        if (!wName && lastWeaponName) {
          wName = `${lastWeaponName} (Alt. mode)`;
        } else if (wName) {
          lastWeaponName = wName;
        }
        unit.weapons.push({
          rowType: 'weapon',
          variant: currentVariant || null,
          Weapons: wName || '-',
          Range: c1 || '-',
          Shots: c2 || '-',
          Pen: c3 || '-',
          Special: c4 || '-',
        });
      }
    } else if (tds.length > 1) {
      unit.weaponNotes.push(tds.map((_, td) => clean($(td).text())).get().filter(Boolean).join(' — '));
    }
  });

  // Special rules text: split by <b> headings; stop unit rules at "... Army Special Rules"
  const srHtml = $('.u_sr').html() || '';
  const parts = srHtml.split(/<b>/i).slice(1);
  let target = null;
  for (const part of parts) {
    const [headRaw, ...rest] = part.split(/<\/b>/i);
    const head = clean(cheerio.load(headRaw).text());
    const body = clean(cheerio.load(rest.join(' ').replace(/<br\s*\/?>/gi, '\n')).text());
    if (/Unit Special Rules/i.test(head)) { target = unit.rules; continue; }
    if (/Army Special Rules/i.test(head)) { target = unit.armyRules; continue; }
    if (!head || !target) continue;
    const m = body.match(/^\((v\d[^)]*)\)\s*/);
    target.push({ name: head, ref: m ? m[1] : null, text: m ? body.slice(m[0].length) : body });
  }

  return unit;
}
